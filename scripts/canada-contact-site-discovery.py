#!/usr/bin/env python3
"""Conservative public OpenStreetMap site discovery for Canada ODHF.

Original Statistics Canada source rows remain untouched. OSM is only a
website-candidate discovery source, not sufficient proof an email is a verified
facility contact. Exact facility-name and near-coordinate matching is required;
an identified website must also mention the facility and address to be marked
a reviewed facility website. All OSM-listed emails stay candidate_unreviewed.
"""
from __future__ import annotations

import argparse
import html
import importlib.util
import ipaddress
import json
import math
import os
import re
import time
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

_helpers_path = Path(__file__).with_name('argentina-contact-email-crawl.py')
_spec = importlib.util.spec_from_file_location('institutional_email_helpers',_helpers_path)
_helper = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_helper)

DISCOVERY_EMAIL_STATUS = 'candidate_unreviewed'
OVERPASS = 'https://overpass-api.de/api/interpreter'
MAX_DISTANCE_METRES = 100
UA = 'HealthcareDirectoryContactResearch/1.0 (bounded public healthcare site discovery)'

GEO_DISCOVERY_SQL = """
SELECT p.source_record_id,p.name,p.formatted_address,p.city,p.state_region,p.lat,p.lng
FROM public.official_registry_providers p
LEFT JOIN public.official_registry_contact_geo_discovery_state x
  ON x.source_record_id=p.source_record_id
WHERE p.country_code='CA' AND p.lat BETWEEN 40 AND 85 AND p.lng BETWEEN -145 AND -50
  AND NOT EXISTS (
    SELECT 1 FROM public.official_registry_contact_websites w
    WHERE w.source_record_id=p.source_record_id
      AND w.verification_status IN ('facility_verified','organization_verified')
  )
  AND (x.attempted_at IS NULL OR x.attempted_at < now() - make_interval(days => %s))
ORDER BY COALESCE(x.attempted_at,'epoch'::timestamptz),p.source_record_id
LIMIT %s
"""


def normalized(value: str) -> str:
    clean=unicodedata.normalize('NFKD',str(value or '')).casefold()
    clean=''.join(ch for ch in clean if not unicodedata.combining(ch))
    return re.sub(r'\s+',' ',re.sub(r'[^a-z0-9]+',' ',clean)).strip()


def distance_m(a_lat,a_lon,b_lat,b_lon):
    rad=math.pi/180
    dlat=(a_lat-b_lat)*rad
    dlon=(a_lon-b_lon)*rad
    h=math.sin(dlat/2)**2+math.cos(a_lat*rad)*math.cos(b_lat*rad)*math.sin(dlon/2)**2
    return 6371000*2*math.asin(min(1,math.sqrt(h)))


def match_places(elements, facility_name, latitude, longitude):
    expected=normalized(facility_name)
    if len(expected.split())<2:
        return []
    found=[]
    seen=set()
    for item in elements if isinstance(elements,list) else []:
        tags=item.get('tags') if isinstance(item,dict) else None
        if not isinstance(tags,dict) or normalized(tags.get('name',''))!=expected:
            continue
        point=item.get('center') if isinstance(item.get('center'),dict) else item
        try:
            metres=distance_m(float(latitude),float(longitude),
                              float(point.get('lat')),float(point.get('lon')))
        except (TypeError,ValueError):
            continue
        if metres>MAX_DISTANCE_METRES:
            continue
        kind=item.get('type')
        oid=item.get('id')
        if kind not in ('node','way','relation') or not isinstance(oid,int) or oid<=0:
            continue
        url=_helper.safe_site_url(tags.get('contact:website') or tags.get('website') or '')
        emails=set()
        for key in ('contact:email','email'):
            emails.update(_helper.extract_emails(str(tags.get(key) or '')))
        if not url and not emails:
            continue
        evidence=f'https://www.openstreetmap.org/{kind}/{oid}'
        if (url,evidence) in seen:
            continue
        seen.add((url,evidence))
        found.append({
            'url':url,
            'emails':emails,
            'evidence_url':evidence,
            'distance_metres':round(metres,1),
            'name':tags.get('name')
        })
    return found


class TextOfPage(HTMLParser):
    def __init__(self):
        super().__init__()
        self.chunks=[]
    def handle_data(self,text):
        if text:
            self.chunks.append(text)


def website_mentions_location(page,facility_name,city,address):
    parser=TextOfPage()
    parser.feed(str(page or ''))
    text=normalized(html.unescape(' '.join(parser.chunks)))
    n=normalized(facility_name)
    c=normalized(city)
    a=normalized(address)
    if len(n.split())<2 or len(c)<3 or len(a.split())<2:
        return False
    # Require a street number to avoid generic 'Main Street' false matches.
    numbers=re.findall(r'\b\d+[a-z]?\b',a)
    if not numbers:
        return False
    return n in text and c in text and a in text


def overpass_nearby(lat,lon,timeout=18):
    # Limit query to direct website-tagged sites or email-tagged facilities.
    query=(f'[out:json][timeout:15];('
           f'nwr(around:100,{float(lat):.7f},{float(lon):.7f})["website"];'
           f'nwr(around:100,{float(lat):.7f},{float(lon):.7f})["contact:website"];'
           f'nwr(around:100,{float(lat):.7f},{float(lon):.7f})["email"];'
           f'nwr(around:100,{float(lat):.7f},{float(lon):.7f})["contact:email"];'
           f');out center tags 60;')
    req=Request(OVERPASS+'?'+urlencode({'data':query}),headers={
        'User-Agent':UA,'Accept':'application/json'
    })
    with urlopen(req,timeout=timeout) as response:
        if 'application/json' not in response.headers.get('content-type',''):
            raise RuntimeError('OpenStreetMap Overpass returned non-JSON data')
        data=json.loads(response.read(1_000_000))
        if not isinstance(data,dict) or not isinstance(data.get('elements'),list):
            raise RuntimeError('Unexpected OpenStreetMap response')
        return data['elements']


def discover(conn, *, limit, retry_after_days, pause, apply):
    with conn.cursor() as c:
        c.execute(GEO_DISCOVERY_SQL,(retry_after_days,limit))
        facilities=c.fetchall()
    attempted=matched=verified_sites=emails=0
    for id,name,address,city,region,lat,lon in facilities:
        try:
            places=match_places(overpass_nearby(lat,lon),name,lat,lon)
        except (HTTPError,URLError,OSError,RuntimeError,ValueError) as exc:
            print(f'could_not_query={id} cause={type(exc).__name__}',flush=True)
            continue # Don't suppress retries after upstream outages.
        attempted+=1
        if places:
            matched+=1
        if apply:
            with conn.cursor() as c:
                for place in places:
                    url=place['url']
                    status='candidate_unreviewed'
                    if url:
                        body=_helper._read_page(url)
                        if body and website_mentions_location(body,name,city,address):
                            status='facility_verified'
                            verified_sites+=1
                        c.execute("""
                          INSERT INTO public.official_registry_contact_websites
                            (source_record_id,website_url,evidence_url,website_scope,
                             verification_status,reviewed_at,notes)
                          VALUES (%s,%s,%s,'facility',%s,
                                  CASE WHEN %s='facility_verified' THEN now() ELSE NULL END,
                                  %s)
                          ON CONFLICT(source_record_id,website_url) DO NOTHING
                        """,(id,url,place['evidence_url'],status,status,
                             f'Conservative OSM exact-name/distance match: {place["distance_metres"]}m'))
                    for email in sorted(place['emails']):
                        c.execute("""
                          INSERT INTO public.official_registry_contact_emails
                            (source_record_id,email,purposes,source_status,match_basis,notes)
                          VALUES (%s,%s,ARRAY['unclassified']::text[],'candidate_unreviewed',
                                  'manual_review','OSM email tag; facility attribution unreviewed.')
                          ON CONFLICT(source_record_id,normalized_email) DO NOTHING
                        """,(id,email))
                        c.execute("""
                          SELECT id FROM public.official_registry_contact_emails
                          WHERE source_record_id=%s AND normalized_email=lower(%s)
                        """,(id,email))
                        row=c.fetchone()
                        if row:
                            c.execute("""
                              INSERT INTO public.official_registry_contact_email_evidence
                                (contact_email_id,source_url,source_title,evidence_note)
                              VALUES (%s,%s,'OpenStreetMap facility tag','Discovery only; not independently verified.')
                              ON CONFLICT(contact_email_id,source_url) DO NOTHING
                            """,(row[0],place['evidence_url']))
                            emails+=1
                c.execute("""
                  INSERT INTO official_registry_contact_geo_discovery_state
                    (source_record_id,attempted_at,candidate_website_count)
                  VALUES (%s,now(),%s)
                  ON CONFLICT(source_record_id) DO UPDATE SET
                    attempted_at=now(),candidate_website_count=EXCLUDED.candidate_website_count
                """,(id,len([p for p in places if p['url']])))
            conn.commit()
        print(f'geocoded_facility={id} matches={len(places)} apply={apply}',flush=True)
        if pause:
            time.sleep(pause)
    print(f'Canada site discovery attempted={attempted} matched={matched} '
          f'auto_confirmed_sites={verified_sites} osm_email_candidates={emails}',flush=True)


def main():
    parser=argparse.ArgumentParser(description='Conservatively discover Canadian facility websites from OSM')
    parser.add_argument('--limit',type=int,default=30)
    parser.add_argument('--pause-seconds',type=float,default=1.5)
    parser.add_argument('--retry-after-days',type=int,default=90)
    parser.add_argument('--apply',action='store_true')
    args=parser.parse_args()
    if not 1<=args.limit<=75 or not 0<=args.pause_seconds<=15:
        parser.error('Invalid limit or pause')
    url=os.getenv('CANADA_REGISTRY_DATABASE_URL') or os.getenv('TARGET_DATABASE_URL')
    if not url or not url.startswith(('postgres://','postgresql://')):
        parser.error('Requires Canada registry PostgreSQL URL')
    import psycopg
    with psycopg.connect(url,connect_timeout=15) as conn:
        discover(conn,limit=args.limit,retry_after_days=args.retry_after_days,pause=args.pause_seconds,apply=args.apply)


if __name__=='__main__':
    main()
