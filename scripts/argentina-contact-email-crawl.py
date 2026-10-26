#!/usr/bin/env python3
"""Find all publicly listed email addresses on Argentine REFES facility websites.

The original REFES snapshot is NEVER updated. Source emails remain
candidate_unreviewed until their exact affiliation is verified independently.
Run with ARGENTINA_REGISTRY_DATABASE_URL and --apply; use --limit for batches.
"""
from __future__ import annotations

import argparse
import html
import ipaddress
import os
import re
import socket
import time
from html.parser import HTMLParser
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
from urllib.request import Request, build_opener, HTTPRedirectHandler

NEW_DISCOVERY_STATUS = 'candidate_unreviewed'
USER_AGENT = 'HealthcareDirectoryContactResearch/1.0 (public institutional emails only)'
EMAIL_PATTERN = re.compile(r'(?<![\w.+-])([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,24})(?![\w.-])')
CONTACT_PATTERN = re.compile(r'contact|contacto|contactenos|turnos|appointments|consultas|secretari|'
                             r'admisi[oó]n|informaci[oó]n|administraci[oó]n|facturaci[oó]n|'
                             r'pacientes|atenci[oó]n|institucional|sobre-nosotros', re.I)
MAX_HTML_BYTES = 1_000_000
MAX_PAGES = 4


class Links(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.hrefs = []
        self._href = None
        self._text = ''

    def handle_starttag(self, tag, attrs):
        if tag.lower() == 'a':
            self._href = dict(attrs).get('href')
            self._text = ''

    def handle_data(self, data):
        if self._href is not None:
            self._text += data

    def handle_endtag(self, tag):
        if tag.lower() == 'a' and self._href:
            self.hrefs.append((self._href, self._text))
            self._href = None
            self._text = ''


def safe_site_url(raw: str) -> str | None:
    raw = str(raw or '').strip()
    if not raw:
        return None
    if not raw.startswith(('https://', 'http://')):
        if '://' in raw or raw.startswith(('#', '/', '\\')):
            return None
        raw = 'https://' + raw
    try:
        uri = urlsplit(raw)
        host = (uri.hostname or '').lower().strip('.')
        if (uri.scheme not in ('http', 'https') or not host or '.' not in host
                or uri.username or uri.password
                or host.endswith(('.local', '.localhost', '.internal', '.test', '.invalid', '.example'))
                or host == 'localhost' or uri.port not in (None, 80, 443)):
            return None
        try:
            ipaddress.ip_address(host)
            return None  # Registered DNS names only, no numeric IP literals.
        except ValueError:
            pass
        if not re.fullmatch(r'[a-z0-9.-]{4,255}', host):
            return None
        path = uri.path or '/'
        return urlunsplit((uri.scheme, uri.netloc.lower(), path, uri.query, ''))
    except ValueError:
        return None


def same_site(candidate: str, root: str) -> bool:
    a, b = urlsplit(candidate), urlsplit(root)
    def normalized_host(h):
        return (h or '').lower().removeprefix('www.')
    return normalized_host(a.hostname) == normalized_host(b.hostname)


def extract_emails(source: str) -> set[str]:
    # Never fabricate email patterns from domains or common prefixes.
    text = html.unescape(unquote(str(source or '')))
    matches = {m.group(1).lower() for m in EMAIL_PATTERN.finditer(text)}
    blocked = {'example.com', 'example.org', 'test.com', 'domain.com', 'email.com'}
    return {v for v in matches if v.partition('@')[2] not in blocked and len(v) <= 320}


def contact_links(source: str, page: str, limit: int = MAX_PAGES) -> list[str]:
    parser = Links()
    parser.feed(source)
    links = []
    for href, label in parser.hrefs:
        href = html.unescape(href).strip()
        if not CONTACT_PATTERN.search(href + ' ' + label):
            continue
        url = safe_site_url(urljoin(page, href))
        if url and same_site(url, page) and url != page and url not in links:
            links.append(url)
        if len(links) >= limit:
            break
    return links


class CheckedRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        safe = safe_site_url(newurl)
        if not safe or not same_site(safe, req.full_url):
            raise URLError('Cross-site or unsafe redirect')
        return super().redirect_request(req, fp, code, msg, headers, safe)


OPENER = build_opener(CheckedRedirects)


def _public_host(uri: str) -> bool:
    """Reject DNS records resolving to private, loopback, or reserved networks."""
    host = urlsplit(uri).hostname or ''
    try:
        ips = socket.getaddrinfo(host, None, type=socket.SOCK_STREAM)
        return bool(ips) and all(
            ipaddress.ip_address(item[4][0]).is_global
            for item in ips
        )
    except (OSError, ValueError):
        return False


def _read_page(uri: str, timeout: float = 10.0) -> str | None:
    if not safe_site_url(uri) or not _public_host(uri):
        return None
    request = Request(uri, headers={'User-Agent': USER_AGENT, 'Accept': 'text/html,*/*;q=0.1'})
    try:
        with OPENER.open(request, timeout=timeout) as response:
            if not response.headers.get('content-type', '').lower().startswith(('text/html', 'application/xhtml+xml')):
                return None
            blob = response.read(MAX_HTML_BYTES + 1)
            if len(blob) > MAX_HTML_BYTES:
                return None
            charset = response.headers.get_content_charset() or 'utf-8'
            return blob.decode(charset, errors='replace')
    except (HTTPError, URLError, OSError, ValueError):
        return None


def allowed_by_robots(uri: str) -> bool:
    from urllib.robotparser import RobotFileParser
    from urllib.parse import urlsplit
    u = urlsplit(uri)
    robots = urlunsplit((u.scheme, u.netloc, '/robots.txt', '', ''))
    if not _public_host(robots):
        return False
    try:
        with OPENER.open(Request(robots, headers={'User-Agent': USER_AGENT}), timeout=7) as res:
            content = res.read(250_000).decode('utf-8', errors='replace')
        robot = RobotFileParser()
        robot.parse(content.splitlines())
        return robot.can_fetch(USER_AGENT, uri)
    except HTTPError as error:
        return error.code in (404, 410)  # No robots policy published.
    except (URLError, OSError, ValueError):
        return False


def extract_facility_candidates(website: str, pause_seconds: float = 0.4) -> tuple[dict[str, set[str]], int]:
    home = safe_site_url(website)
    if not home or not allowed_by_robots(home):
        return {}, 0
    visits = {}
    queue = [home]
    while queue and len(visits) < MAX_PAGES:
        url = queue.pop(0)
        if not same_site(url, home) or not allowed_by_robots(url):
            continue
        content = _read_page(url)
        if content is None:
            continue
        visits[url] = content
        for link in contact_links(content, url, MAX_PAGES):
            if link not in visits and link not in queue:
                queue.append(link)
        if queue and pause_seconds > 0:
            time.sleep(pause_seconds)
    found: dict[str, set[str]] = {}
    for url, body in visits.items():
        for email in extract_emails(body):
            found.setdefault(email, set()).add(url)
    return found, len(visits)


def crawl_and_store(conn, limit: int, apply: bool, retry_after_days: int, pause: float):
    query = """
      SELECT p.source_record_id,p.name,p.city,p.state_region,p.website
      FROM public.official_registry_providers p
      LEFT JOIN public.official_registry_contact_crawl_state s
        ON s.source_record_id=p.source_record_id
      WHERE p.country_code='AR'
        AND nullif(btrim(p.website),'') IS NOT NULL
        AND (s.attempted_at IS NULL OR s.attempted_at < now() - make_interval(days => %s))
      ORDER BY COALESCE(s.attempted_at,'epoch'::timestamptz),p.source_record_id
      LIMIT %s
    """
    with conn.cursor() as cursor:
        cursor.execute(query, (retry_after_days, limit))
        records = cursor.fetchall()
    completed = emails_observed = facilities_with_candidate = 0
    for source_id, name, city, region, website in records:
        candidates, pages = extract_facility_candidates(website, pause)
        if candidates:
            facilities_with_candidate += 1
        emails_observed += len(candidates)
        if apply:
            with conn.cursor() as cursor:
                for email, urls in candidates.items():
                    cursor.execute("""
                      INSERT INTO public.official_registry_contact_emails
                        (source_record_id,email,purposes,source_status,match_basis,notes,last_source_checked_at)
                      VALUES (%s,%s,ARRAY['unclassified']::text[],'candidate_unreviewed',
                              'website_facility_match',
                              'Automatically found on referenced website; facility affiliation requires review.',
                              now())
                      ON CONFLICT (source_record_id,normalized_email) DO UPDATE SET
                        last_source_checked_at=now()
                      RETURNING id
                    """, (source_id, email))
                    email_id = cursor.fetchone()[0]
                    for url in sorted(urls):
                        cursor.execute("""
                          INSERT INTO public.official_registry_contact_email_evidence
                            (contact_email_id,source_url,source_title,evidence_note)
                          VALUES (%s,%s,%s,%s)
                          ON CONFLICT (contact_email_id,source_url) DO NOTHING
                        """, (email_id, url, 'Associated facility website',
                              'Automated webpage extraction; attribution pending review'))
                cursor.execute("""
                  INSERT INTO public.official_registry_contact_crawl_state
                    (source_record_id,attempted_at,pages_scanned,candidate_email_count)
                  VALUES (%s,now(),%s,%s)
                  ON CONFLICT(source_record_id) DO UPDATE SET
                    attempted_at=now(),pages_scanned=EXCLUDED.pages_scanned,
                    candidate_email_count=EXCLUDED.candidate_email_count
                """, (source_id, pages, len(candidates)))
            conn.commit()
        completed += 1
        print(f'{completed}/{len(records)} REFES={source_id} pages={pages} candidate_emails={len(candidates)}', flush=True)
        if pause > 0:
            time.sleep(pause)
    print(f'Result: facilities_scanned={completed},with_emails={facilities_with_candidate},'
          f'email_candidates={emails_observed},persisted={apply}',flush=True)


def main():
    parser = argparse.ArgumentParser(description='Collect candidate institutional emails without guessing or replacing REFES rows')
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--retry-after-days', type=int, default=90)
    parser.add_argument('--pause-seconds', type=float, default=0.5)
    parser.add_argument('--apply', action='store_true', help='Persist candidate emails and crawl state')
    args = parser.parse_args()
    if not 1 <= args.limit <= 300:
        parser.error('limit must be between 1 and 300')
    if not 0 <= args.pause_seconds <= 20:
        parser.error('pause must be between 0 and 20 seconds')
    url = os.environ.get('ARGENTINA_REGISTRY_DATABASE_URL') or os.environ.get('TARGET_DATABASE_URL')
    if not url or not url.startswith(('postgresql://','postgres://')):
        parser.error('Requires ARGENTINA_REGISTRY_DATABASE_URL or TARGET_DATABASE_URL')
    import psycopg
    with psycopg.connect(url, connect_timeout=15) as connection:
        crawl_and_store(connection,args.limit,args.apply,args.retry_after_days,args.pause_seconds)


if __name__ == '__main__':
    main()
