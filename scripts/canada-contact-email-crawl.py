#!/usr/bin/env python3
"""Collect *all* publicly listed facility/department emails from reviewed
Canadian health facility websites, without altering the ODHF facility table.

Canada's ODHF currently has zero website fields. This script starts from
official_registry_contact_websites (reviewed facility or organization links).
Discovered emails remain unpublished candidates until their affiliation is
reviewed, with per-email source-page evidence.
"""
from __future__ import annotations

import argparse
import importlib.util
import os
from pathlib import Path
import re
import time

_shared_path = Path(__file__).with_name('argentina-contact-email-crawl.py')
_spec = importlib.util.spec_from_file_location('institutional_email_helpers', _shared_path)
_shared = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_shared)

# Reuse the safety, robots.txt, email extraction, URL, and crawl limits of the
# already-tested Argentina implementation. Include Canadian French navigation.
_shared.CONTACT_PATTERN = re.compile(
    _shared.CONTACT_PATTERN.pattern +
    r'|nous[- ]joindre|contactez[- ]nous|coordonn[eé]es|carri[eè]res|emplois|'
    r'dossiers[- ]m[eé]dicaux|privacy|confidentialit[eé]|accessibilit[eé]|'
    r'patient[- ]relations|ressources[- ]humaines|careers|about[- ]us',
    re.I
)
extract_emails = _shared.extract_emails
contact_links = _shared.contact_links
safe_site_url = _shared.safe_site_url
extract_facility_candidates = _shared.extract_facility_candidates
NEW_DISCOVERY_STATUS = 'candidate_unreviewed'

CANADA_CRAWL_SQL = """
SELECT p.source_record_id,p.name,p.city,p.state_region,w.website_url
FROM public.official_registry_providers p
JOIN public.official_registry_contact_websites w
  ON w.source_record_id = p.source_record_id
LEFT JOIN public.official_registry_contact_website_crawl_state s
  ON s.source_record_id = w.source_record_id AND s.website_url = w.website_url
WHERE p.country_code='CA'
  AND w.verification_status IN ('facility_verified','organization_verified')
  AND (s.attempted_at IS NULL OR s.attempted_at < now() - make_interval(days => %s))
ORDER BY COALESCE(s.attempted_at,'epoch'::timestamptz),p.source_record_id,w.website_url
LIMIT %s
"""

def scan(conn, *, limit: int, retry_after_days: int, pause: float, apply: bool):
    with conn.cursor() as cursor:
        cursor.execute(CANADA_CRAWL_SQL, (retry_after_days, limit))
        sites = cursor.fetchall()

    email_count = 0
    visited = 0
    sites_with_contacts = 0
    for source_id, facility_name, city, region, website in sites:
        found, pages = extract_facility_candidates(website, pause)
        visited += 1
        email_count += len(found)
        if found:
            sites_with_contacts += 1
        if apply:
            with conn.cursor() as cursor:
                for email, urls in sorted(found.items()):
                    cursor.execute("""
                        INSERT INTO public.official_registry_contact_emails
                          (source_record_id,email,purposes,source_status,match_basis,notes,last_source_checked_at)
                        VALUES (%s,%s,ARRAY['unclassified']::text[],'candidate_unreviewed',
                                'website_facility_match',
                                'Email found on a reviewed website; department/facility ownership requires review.',
                                now())
                        ON CONFLICT(source_record_id,normalized_email) DO UPDATE SET
                          last_source_checked_at=now()
                        RETURNING id
                    """, (source_id,email))
                    contact_id = cursor.fetchone()[0]
                    for url in sorted(urls):
                        cursor.execute("""
                            INSERT INTO public.official_registry_contact_email_evidence
                              (contact_email_id,source_url,source_title,evidence_note)
                            VALUES (%s,%s,%s,%s)
                            ON CONFLICT(contact_email_id,source_url) DO NOTHING
                        """, (contact_id,url,'Canadian facility public website',
                              'Webpage extraction; contact role/association pending human verification'))
                cursor.execute("""
                    INSERT INTO public.official_registry_contact_website_crawl_state
                      (source_record_id,website_url,attempted_at,pages_scanned,candidate_email_count)
                    VALUES (%s,%s,now(),%s,%s)
                    ON CONFLICT(source_record_id,website_url) DO UPDATE SET
                      attempted_at=now(),pages_scanned=EXCLUDED.pages_scanned,
                      candidate_email_count=EXCLUDED.candidate_email_count
                """, (source_id,website,pages,len(found)))
            conn.commit()
        print(f'facility={source_id} pages={pages} candidate_emails={len(found)}',flush=True)
        if pause > 0:
            time.sleep(pause)
    print(
        f'Canada scanned_sites={visited} sites_with_email={sites_with_contacts} '
        f'email_candidates={email_count} persisted={apply}',
        flush=True
    )


def main():
    ap = argparse.ArgumentParser(description='Review-safe Canada ODHF multi-email public website extraction')
    ap.add_argument('--limit',type=int,default=50)
    ap.add_argument('--retry-after-days',type=int,default=90)
    ap.add_argument('--pause-seconds',type=float,default=0.8)
    ap.add_argument('--apply',action='store_true')
    args = ap.parse_args()
    if not 1 <= args.limit <= 300:
        ap.error('--limit must be between 1 and 300')
    if not 0 <= args.pause_seconds <= 15:
        ap.error('--pause-seconds must be between 0 and 15')
    url = os.environ.get('CANADA_REGISTRY_DATABASE_URL') or os.environ.get('TARGET_DATABASE_URL')
    if not url or not url.startswith(('postgresql://','postgres://')):
        ap.error('Set CANADA_REGISTRY_DATABASE_URL or TARGET_DATABASE_URL')
    import psycopg
    with psycopg.connect(url,connect_timeout=15) as conn:
        scan(conn,limit=args.limit,retry_after_days=args.retry_after_days,pause=args.pause_seconds,apply=args.apply)


if __name__ == '__main__':
    main()
