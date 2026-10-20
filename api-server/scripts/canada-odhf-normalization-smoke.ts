import assert from "node:assert/strict";
import { normalizeCanada } from "../src/routes/internationalRegistryLayers";

// Real ArcGIS layer field names published by the Government of Canada at
// https://www.earthquakescanada.nrcan.gc.ca/server2_serveur2/rest/services/StatCan/OpenDatabaseHealthFacilities/MapServer/layers
const officialArcgis = normalizeCanada({
  attributes: {
    OBJECTID: 204,
    name_nom: "Northern Regional Hospital",
    facility_type: "Hospitals",
    address: "123 Main Street",
    city_ville: "Yellowknife",
    province_en: "Northwest Territories",
    pc_cp: "X1A 2B3",
    provider: "Regional Health Authority",
  },
  geometry: { x: -114.3718, y: 62.4540 },
});
assert.ok(officialArcgis, "the officially named facility must be retained");
assert.equal(officialArcgis.name, "Northern Regional Hospital");
assert.equal(officialArcgis.address, "123 Main Street");
assert.equal(officialArcgis.city, "Yellowknife");
assert.equal(officialArcgis.state, "Northwest Territories");
assert.equal(officialArcgis.postal_code, "X1A 2B3");
assert.equal(officialArcgis.category, "Hospitals");
assert.equal(officialArcgis.clinic_type, "hospital");
assert.equal(officialArcgis.source_id, "204");
assert.ok(!JSON.stringify(officialArcgis).includes("Unnamed"));

const legacyCsv = normalizeCanada({
  attributes: {
    OBJECTID: 205,
    facility_name: "Community Health Centre",
    odhf_facility_type: "Ambulatory health care services",
    source_format_str_address: "45 King Road",
    city: "Ottawa",
    province: "ON",
    postal_code: "K1A 0B1",
  },
  geometry: { x: -75.6972, y: 45.4215 },
});
assert.ok(legacyCsv);
assert.equal(legacyCsv.name, "Community Health Centre");
assert.equal(legacyCsv.address, "45 King Road");
assert.equal(legacyCsv.city, "Ottawa");
assert.equal(legacyCsv.clinic_type, "general_practitioner");

const v2 = normalizeCanada({
  attributes: {
    id: "v2-1",
    name: "Canada Diagnostic Clinic",
    type: "Diagnostic services",
    address: "300 Queen Street",
    csdname: "Toronto",
    prov_terr: "ON",
  },
  geometry: { x: -79.385, y: 43.65 },
});
assert.ok(v2);
assert.equal(v2.name, "Canada Diagnostic Clinic");
assert.equal(v2.address, "300 Queen Street");
assert.equal(v2.city, "Toronto");
assert.equal(v2.state, "ON");

assert.equal(normalizeCanada({
  attributes: { OBJECTID: 206, facility_type: "Hospitals", address: "800 Road" },
  geometry: { x: -123.12, y: 49.28 },
}), null, "never render an anonymous facility as a normal named marker");

assert.equal(normalizeCanada({
  attributes: { name_nom: "Unnamed Canadian healthcare facility" },
  geometry: { x: -123.12, y: 49.28 },
}), null, "legacy generated names are not facility identities");

assert.equal(normalizeCanada({
  attributes: { name_nom: "Valid Clinic" }, geometry: { x: -200, y: 80 },
}), null, "invalid coordinates are rejected");

console.log("Canada ODHF normalization smoke tests passed.");
