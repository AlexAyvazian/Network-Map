-- Canada ODHF: separate discovered websites and crawl checkpoints.
-- Execute after scripts/official-registry-contact-enrichment.sql.
-- The original Canada provider table remains unchanged and continues refreshing.
-- All website association evidence remains source-backed and scoped to a facility
-- or a clearly identified healthcare organization.
CREATE TABLE IF NOT EXISTS public.official_registry_contact_websites (
  source_record_id text NOT NULL,
  website_url text NOT NULL CHECK (website_url ~ '^https?://'),
  evidence_url text NOT NULL CHECK (evidence_url ~ '^https?://'),
  website_scope text NOT NULL CHECK (website_scope IN ('facility','organization')),
  verification_status text NOT NULL CHECK (verification_status IN ('facility_verified','organization_verified','candidate_unreviewed')),
  discovered_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  notes text,
  PRIMARY KEY (source_record_id, website_url)
);

CREATE TABLE IF NOT EXISTS public.official_registry_contact_website_crawl_state (
  source_record_id text NOT NULL,
  website_url text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  pages_scanned integer NOT NULL DEFAULT 0 CHECK (pages_scanned >= 0),
  candidate_email_count integer NOT NULL DEFAULT 0 CHECK (candidate_email_count >= 0),
  PRIMARY KEY (source_record_id, website_url)
);
CREATE INDEX IF NOT EXISTS official_registry_contact_websites_status_idx
  ON public.official_registry_contact_websites (verification_status, source_record_id);

-- OSM geospatial queries are scheduled in limited batches. Retry failed upstream
-- fetches, and retain checkpoints independently of source snapshot refreshes.
CREATE TABLE IF NOT EXISTS public.official_registry_contact_geo_discovery_state (
  source_record_id text PRIMARY KEY,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  candidate_website_count integer NOT NULL DEFAULT 0 CHECK (candidate_website_count >= 0)
);
