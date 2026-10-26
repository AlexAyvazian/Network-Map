import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import express from "express";

// Every provider database answers from an in-memory fake, so this checks the
// request shape the routes send to Neon without needing network access.
process.env.DATABASE_URL = "postgresql://primary.invalid/providers";
process.env.HEALTHSITES_DATABASE_URL = "postgresql://healthsites-1.invalid/providers";
process.env.CANADA_REGISTRY_DATABASE_URL = "postgresql://canada.invalid/registry";

const { closeDatabasePools, getProviderDatabaseProjects, getRegistryDatabaseProject } = await import("@workspace/db");
const { default: categoryRouter } = await import("../src/routes/providerCategoryLayers");
const { default: registryRouter } = await import("../src/routes/storedInternationalRegistryLayers");

type Executed = { database: string; sql: string };
const executed: Executed[] = [];

function fakePool(database: string, rowsFor: (sql: string) => Record<string, unknown>[]) {
  return async () => ({
    async query(sql: string) {
      const compact = sql.replace(/\s+/g, " ").trim();
      if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(compact) || compact.startsWith("SELECT set_config")) return { rows: [], rowCount: 0 };
      executed.push({ database, sql: compact });
      const rows = rowsFor(compact);
      return { rows, rowCount: rows.length };
    },
    release() {},
  });
}

function providerRows(prefix: string, count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index}`, master_key: `${prefix}-${index}`, name: `${prefix} clinic ${index}`,
    lat: 30 + index / 10_000, lng: -90, primary_provider_type: "urgent_care", capability_tags: ["urgent_care"],
  }));
}

const projects = getProviderDatabaseProjects();
assert.equal(projects.length, 2);
for (const [index, project] of projects.entries()) {
  const rows = providerRows(project.id, index === 0 ? 4_500 : 2_600);
  (project.pool as unknown as { connect: unknown }).connect = fakePool(project.id, (sql) => {
    if (sql.includes("to_regclass")) return [{ ok: true }];
    if (sql.includes("count(*)")) return [{ total: rows.length }];
    return rows;
  });
}
const registry = getRegistryDatabaseProject("canada-odhf");
assert.ok(registry);
const registryRows = providerRows("ca", 3_200).map((row) => ({ ...row, source_record_id: row.id, country_code: "CA" }));
(registry.pool as unknown as { connect: unknown }).connect = fakePool("canada", (sql) => {
  if (sql.includes("to_regclass")) return [{ ok: true }];
  if (sql.includes("count(*)")) return [{ total: 9_999 }];
  return registryRows;
});

const app = express();
app.use("/api", categoryRouter);
app.use("/api", registryRouter);
const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
const viewport = "useBounds=true&north=50&south=24&east=-66&west=-125&limit=2000";

try {
  // Category layer: one response holds every row from every provider database.
  const category = await (await fetch(`${base}/provider-category-layers/urgent-cares?${viewport}&allInView=true`)).json();
  assert.equal(category.providers.length, 7_100);
  assert.equal(category.total, 7_100);
  assert.equal(category.hasMore, false);
  assert.deepEqual(category.databaseProjects, projects.map((project) => project.id));
  const categoryQueries = executed.filter((entry) => !entry.sql.includes("to_regclass"));
  assert.equal(categoryQueries.length, 2, "one viewport query per provider database");
  assert.ok(categoryQueries.every((entry) => !/count\(\*\)|OFFSET|ORDER BY/.test(entry.sql)), "no count, OFFSET or sort in single-request mode");

  // The schema probe is cached, so a second toggle sends only the data queries.
  executed.length = 0;
  await (await fetch(`${base}/provider-category-layers/urgent-cares?${viewport}&allInView=true`)).json();
  assert.equal(executed.filter((entry) => entry.sql.includes("to_regclass")).length, 0);
  assert.equal(executed.length, 2);

  // Older clients that page through results keep working.
  const paged = await (await fetch(`${base}/provider-category-layers/urgent-cares?${viewport}&page=1`)).json();
  assert.equal(paged.total, 7_100);
  assert.equal(paged.hasMore, true);

  // Registry layer: national count and the viewport rows, no paging.
  executed.length = 0;
  const registryResponse = await (await fetch(`${base}/stored-international-registry-layers/canada-odhf?${viewport}&allInView=true`)).json();
  assert.equal(registryResponse.providers.length, 3_200);
  assert.equal(registryResponse.total, 3_200);
  assert.equal(registryResponse.nationalTotal, 9_999);
  assert.equal(registryResponse.hasMore, false);
  assert.equal(executed.filter((entry) => !entry.sql.includes("to_regclass")).length, 2, "national count + one viewport query");
  assert.ok(!executed.some((entry) => /OFFSET/.test(entry.sql)));

  const registryPaged = await (await fetch(`${base}/stored-international-registry-layers/canada-odhf?${viewport}&page=2`)).json();
  assert.equal(registryPaged.page, 2);
  assert.equal(registryPaged.total, 9_999);
  assert.equal(registryPaged.hasMore, true);
} finally {
  server.close();
  await closeDatabasePools();
}

console.log("provider layer single-request smoke tests passed");
