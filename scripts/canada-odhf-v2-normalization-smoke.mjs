import assert from "node:assert/strict";
import {
  CANADA_REGISTRY_COLUMNS, normalizeCanadaV2Feature, mapCanadaFacilityType, canadaTsvField,
} from "./canada-odhf-v2-normalizer.mjs";

const feature = {
  type: "Feature",
  properties: {
    id: "official-v2-177", source_id: "province-12",
    name: "North Coast Hospital", address: "21 Health Street",
    type: "Hospital", prov_terr: "BC", csdname: "Prince Rupert",
    health_authority: "Northern Health",
  },
  geometry: { type: "Point", coordinates: [-130.32, 54.31] },
};
const row = normalizeCanadaV2Feature(feature);
assert.ok(row);
assert.equal(row.length, CANADA_REGISTRY_COLUMNS.length);
const field = col => row[CANADA_REGISTRY_COLUMNS.indexOf(col)];
assert.equal(field("source_record_id"), "official-v2-177");
assert.equal(field("name"), "North Coast Hospital");
assert.equal(field("address_line1"), "21 Health Street");
assert.equal(field("city"), "Prince Rupert");
assert.equal(field("state_region"), "BC");
assert.equal(field("country_code"), "CA");
assert.equal(field("primary_provider_type"), "hospital");
assert.equal(field("capability_tags"), '{"Hospital"}');
assert.equal(field("source_url").includes("statcan.gc.ca"), true);
assert.deepEqual([field("lng"), field("lat")], [-130.32, 54.31]);

assert.equal(mapCanadaFacilityType("Diagnostic services"), "healthcare_facility",
  "Do not claim a diagnostic facility offers specific lab or imaging services");
assert.equal(mapCanadaFacilityType("Pharmacy"), "pharmacy");
assert.equal(mapCanadaFacilityType("Nursing and residential care facilities"), "residential_care");
assert.equal(mapCanadaFacilityType("Clinic"), "general_practitioner");

assert.equal(normalizeCanadaV2Feature({
  ...feature, properties: { ...feature.properties, name: "" },
}), null, "Never invent names");
assert.equal(normalizeCanadaV2Feature({
  ...feature, geometry: { type: "Point", coordinates: [0, 0] },
}), null, "Reject invalid Canada coordinates");
assert.equal(normalizeCanadaV2Feature({
  ...feature, geometry: { type: "LineString", coordinates: [[-123, 49], [-124, 50]] },
}), null, "Only facility points may be imported");
assert.equal(canadaTsvField("Côte d'Ivoire\nUnit 1"), '"Côte d\'Ivoire Unit 1"');
assert.equal(canadaTsvField(null), "\\N");
console.log("StatsCan ODHF v2 normalization tests passed.");
