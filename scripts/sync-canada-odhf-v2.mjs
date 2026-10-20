#!/usr/bin/env node
/**
 * Download Canada's current (September 2026) ODHF v2 GeoJSON directly from
 * Statistics Canada. Does not depend on the Network Map API or Render deploy
 * timing. Importer transactions preserve the existing registry if this fails.
 */
import { execFileSync, spawn } from "node:child_process";
import { createWriteStream, readFileSync, openSync, closeSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { once } from "node:events";
import os from "node:os";
import path from "node:path";
import {
  CANADA_REGISTRY_COLUMNS, OFFICIAL_CANADA_ODHF_V2_ZIP,
  normalizeCanadaV2Feature, canadaTsvField,
} from "./canada-odhf-v2-normalizer.mjs";

const outputIndex = process.argv.indexOf("--output");
const output = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
if (!output) throw new Error("Usage: node scripts/sync-canada-odhf-v2.mjs --output /path/provider.tsv");

async function unzipMember(archive, member, destination) {
  const fd = openSync(destination, "w");
  let stderr = "";
  let code;
  try {
    const process = spawn("unzip", ["-p", archive, member], {
      stdio: ["ignore", fd, "pipe"],
    });
    process.stderr.on("data", chunk => { stderr += String(chunk).slice(0, 2000); });
    [code] = await once(process, "close");
  } finally { closeSync(fd); }
  if (code !== 0) throw new Error("Unable to extract official ODHF GeoJSON: " + stderr.slice(0, 500));
}

const dir = await mkdtemp(path.join(os.tmpdir(), "canada-odhf-v2-"));
try {
  const archive = path.join(dir, "odhf-v2.zip");
  execFileSync("curl", [
    "--fail", "--location", "--silent", "--show-error", "--retry", "3", "--retry-all-errors",
    "--max-time", "180", OFFICIAL_CANADA_ODHF_V2_ZIP, "--output", archive,
  ], { timeout: 210_000 });
  const members = execFileSync("unzip", ["-Z1", archive], { encoding: "utf8", timeout: 30_000 })
    .split(/\r?\n/).map(v => v.trim());
  const member = members.find(name => /\.geojson$/i.test(name))
    ?? members.find(name => /\.json$/i.test(name));
  if (!member) throw new Error("Official ODHF v2 download contained no GeoJSON dataset");

  const geojson = path.join(dir, "odhf.geojson");
  await unzipMember(archive, member, geojson);
  const collection = JSON.parse(readFileSync(geojson, "utf8").replace(/^\uFEFF/, ""));
  if (collection?.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
    throw new Error("Official ODHF v2 response is not a GeoJSON FeatureCollection");
  }
  if (collection.features.length < 10_000 || collection.features.length > 150_000) {
    throw new Error("Unexpected Statistics Canada ODHF v2 feature count: " + collection.features.length);
  }

  const seen = new Set();
  const lines = [CANADA_REGISTRY_COLUMNS.join("\t")];
  let skipped = 0;
  for (const feature of collection.features) {
    const row = normalizeCanadaV2Feature(feature);
    if (!row || seen.has(row[0])) { skipped++; continue; }
    seen.add(row[0]);
    lines.push(row.map(canadaTsvField).join("\t"));
  }
  const valid = lines.length - 1;
  // Do not replace a 6k registry with an incomplete or broken v2 export.
  if (valid < 10_000) throw new Error("Too few valid named ODHF v2 records: " + valid);
  const writer = createWriteStream(output, { encoding: "utf8" });
  for (const line of lines) {
    if (!writer.write(line + "\n")) await once(writer, "drain");
  }
  writer.end();
  await once(writer, "finish");
  console.error("Statistics Canada ODHF v2: " + collection.features.length + " features, " +
    valid + " validated named facilities, " + skipped + " skipped/duplicates");
  process.stdout.write(String(valid) + "\n");
} finally {
  await rm(dir, { recursive: true, force: true });
}
