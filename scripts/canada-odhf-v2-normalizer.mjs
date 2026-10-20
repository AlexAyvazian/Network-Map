import { createHash } from "node:crypto";

export const OFFICIAL_CANADA_ODHF_V2_URL = "https://www150.statcan.gc.ca/n1/en/pub/13-26-0001/132600012020001-eng.htm";
export const OFFICIAL_CANADA_ODHF_V2_ZIP = "https://www150.statcan.gc.ca/n1/en/pub/13-26-0001/2020001/zip/odhf_v2_geojson.zip";

export const CANADA_REGISTRY_COLUMNS = [
  "source_record_id", "source_url", "name", "normalized_name", "address_line1",
  "formatted_address", "city", "state_region", "postal_code", "country_code",
  "lat", "lng", "phone", "website", "email", "primary_provider_type",
  "capability_tags", "quality_score", "master_key",
];

const txt = value => typeof value === "string" || typeof value === "number"
  ? String(value).trim() : "";
const isEmpty = value => !value || /^(?:none|unknown|n\/?a|null|undefined|unnamed(?: canadian healthcare facility| provider)?)$/i.test(value);
const normalized = value => txt(value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, " ").trim();
const postgresArray = values => "{" + values.map(v => '"' + v.replaceAll("\\", "\\\\").replaceAll('"', '\\"') + '"').join(",") + "}";

export function mapCanadaFacilityType(value) {
  const type = normalized(value);
  if (/hospital/.test(type)) return "hospital";
  if (/pharmac/.test(type)) return "pharmacy";
  if (/clinic|ambulatory/.test(type)) return "general_practitioner";
  if (/nursing|residential/.test(type)) return "residential_care";
  // "Diagnostic services" includes labs AND imaging: don't invent a specific capability.
  return "healthcare_facility";
}

/** Strict, explicit mapping of Statistics Canada's 2026 ODHF v2 GeoJSON schema. */
export function normalizeCanadaV2Feature(feature) {
  if (feature?.type !== "Feature" || feature?.geometry?.type !== "Point") return null;
  const [lngRaw, latRaw] = feature.geometry.coordinates ?? [];
  const lat = Number(latRaw), lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < 40 || lat > 85 || lng < -150 || lng > -40) return null;
  const p = feature.properties ?? {};
  const name = txt(p.name);
  if (isEmpty(name)) return null;
  const address = txt(p.address);
  const city = txt(p.csdname);
  const province = txt(p.prov_terr);
  const type = txt(p.type) || "Healthcare facility";
  const originalId = txt(p.id) || txt(feature.id);
  const id = originalId || createHash("sha256")
    .update([name, address, province, String(lat), String(lng)].join("|"))
    .digest("hex").slice(0, 26);
  return [
    id, OFFICIAL_CANADA_ODHF_V2_URL, name, normalized(name),
    isEmpty(address) ? null : address, isEmpty(address) ? null : address,
    isEmpty(city) ? null : city, isEmpty(province) ? null : province,
    null, "CA", lat, lng, null, null, null,
    mapCanadaFacilityType(type), postgresArray([type]),
    0.97, "canada-odhf-v2:" + id,
  ];
}

/** Postgres COPY-compatible tab-delimited field formatting. */
export function canadaTsvField(value) {
  if (value === null || value === undefined || value === "") return "\\N";
  return '"' + String(value).replaceAll('"', '""').replaceAll("\r", " ").replaceAll("\n", " ").replaceAll("\t", " ") + '"';
}
