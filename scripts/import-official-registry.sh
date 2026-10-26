#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_DATABASE_URL:?TARGET_DATABASE_URL is required}"
: "${REGISTRY_TSV:?REGISTRY_TSV is required}"
: "${REGISTRY_EXPECTED:?REGISTRY_EXPECTED is required}"
: "${REGISTRY_SOURCE_KEY:?REGISTRY_SOURCE_KEY is required}"
: "${REGISTRY_COUNTRY_CODE:?REGISTRY_COUNTRY_CODE is required}"

columns="source_record_id,source_url,name,normalized_name,address_line1,formatted_address,city,state_region,postal_code,country_code,lat,lng,phone,website,email,primary_provider_type,capability_tags,quality_score,master_key"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/official-registry-schema.sql

# Load the candidate into staging first. The serving snapshot is untouched until
# the candidate has passed validation.
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 -c "
  CREATE UNLOGGED TABLE IF NOT EXISTS public.official_registry_providers_stage
    (LIKE public.official_registry_providers INCLUDING DEFAULTS INCLUDING CONSTRAINTS INCLUDING INDEXES);
  TRUNCATE public.official_registry_providers_stage;
"

psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "\\copy public.official_registry_providers_stage (${columns}) FROM STDIN WITH (FORMAT csv, HEADER true, DELIMITER E'\\t', NULL '\\N', QUOTE '\"', ESCAPE '\"')" \
  < "$REGISTRY_TSV"

actual="$(psql "$TARGET_DATABASE_URL" -Atqc "
  SELECT count(*)
  FROM public.official_registry_providers_stage
  WHERE country_code = '${REGISTRY_COUNTRY_CODE}'
    AND name IS NOT NULL AND btrim(name) <> ''
    AND lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180
")"
[[ "$actual" == "$REGISTRY_EXPECTED" ]] || {
  echo "Registry candidate mismatch ${actual} vs ${REGISTRY_EXPECTED}; existing snapshot preserved" >&2
  exit 1
}

# PostgreSQL TRUNCATE is transactional. If promotion or metadata update fails,
# the previous production snapshot is restored by rollback. Feed the SQL through
# stdin so psql performs :variable interpolation before sending it to PostgreSQL.
psql "$TARGET_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -v source_key="$REGISTRY_SOURCE_KEY" \
  -v country_code="$REGISTRY_COUNTRY_CODE" \
  -v record_count="$actual" <<SQL
BEGIN;
LOCK TABLE public.official_registry_providers IN ACCESS EXCLUSIVE MODE;

SELECT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'official_registry_providers'
    AND column_name = 'emails'
) AS has_contact_enrichment \gset

\if :has_contact_enrichment
CREATE TEMP TABLE registry_contact_snapshot ON COMMIT DROP AS
SELECT source_record_id, name, normalized_name, phone, website, email, emails
FROM public.official_registry_providers
WHERE cardinality(emails) > 0;
\else
CREATE TEMP TABLE registry_contact_snapshot (
  source_record_id text PRIMARY KEY,
  name text,
  normalized_name text,
  phone text,
  website text,
  email text,
  emails text[]
) ON COMMIT DROP;
\endif

TRUNCATE public.official_registry_providers;
INSERT INTO public.official_registry_providers (${columns})
  SELECT ${columns}
  FROM public.official_registry_providers_stage;

\if :has_contact_enrichment
UPDATE public.official_registry_providers AS p
SET name = s.name,
    normalized_name = s.normalized_name,
    phone = COALESCE(NULLIF(s.phone, ''), p.phone),
    website = COALESCE(NULLIF(s.website, ''), p.website),
    email = COALESCE(NULLIF(s.email, ''), p.email),
    emails = s.emails
FROM registry_contact_snapshot AS s
WHERE p.source_record_id = s.source_record_id;
\endif

INSERT INTO public.official_registry_metadata
  (source_key, country_code, record_count, synchronized_at)
VALUES (:'source_key', :'country_code', :'record_count'::bigint, now())
ON CONFLICT (source_key) DO UPDATE SET
  country_code = EXCLUDED.country_code,
  record_count = EXCLUDED.record_count,
  synchronized_at = EXCLUDED.synchronized_at;
COMMIT;
TRUNCATE public.official_registry_providers_stage;
SQL

echo "Promoted ${actual} ${REGISTRY_SOURCE_KEY} providers"
