import assert from "node:assert/strict";
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  ...(process.env.NETWORK_MAP_CHROMIUM_EXECUTABLE
    ? { executablePath: process.env.NETWORK_MAP_CHROMIUM_EXECUTABLE }
    : {}),
  args: [
    "--no-sandbox",
    "--enable-unsafe-swiftshader",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--disable-dev-shm-usage",
  ],
});
const baseUrl = process.env.NETWORK_MAP_CI_UI_URL || "http://127.0.0.1:4173";
const errors = [];
try {
  for (const { reducedMotion, stalledFrames } of [
    { reducedMotion: "no-preference", stalledFrames: false },
    { reducedMotion: "reduce", stalledFrames: false },
    { reducedMotion: "no-preference", stalledFrames: true },
  ]) {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion,
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://api.mapbox.com/**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: 8,
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#e7edf3" },
            },
          ],
        }),
      }),
    );
    await page.route("https://events.mapbox.com/**", (route) =>
      route.fulfill({ status: 204, body: "" }),
    );
    await page.route("**/api/**", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          providers: [],
          total: 0,
          page: 1,
          hasMore: false,
          cells: [],
          results: [],
          items: [],
        }),
      }),
    );
    await page.goto(baseUrl);
    await page
      .locator(".nm-landing-globe-stage canvas")
      .waitFor({ state: "visible", timeout: 30000 });
    const landingFonts = await page.evaluate(() => ({
      body: getComputedStyle(document.body).fontFamily,
      landing: getComputedStyle(document.querySelector(".nm-landing")).fontFamily,
      button: getComputedStyle(document.querySelector(".nm-landing-enter")).fontFamily,
      remoteFonts: document.querySelectorAll('link[href*="fonts.googleapis.com"]').length,
    }));
    for (const family of [landingFonts.body, landingFonts.landing, landingFonts.button]) {
      assert.match(family, /-apple-system/, "Apple system font is preferred");
      assert.doesNotMatch(family, /Inter|IBM Plex/, "No legacy font override");
    }
    assert.equal(landingFonts.remoteFonts, 0, "No remote Google font stylesheet");
    assert.equal(
      await page.locator(".app-wrap").count(),
      0,
      "Map must not mount behind the landing page",
    );
    assert.equal(
      await page.locator('[data-testid="entry-rings"]').count(),
      0,
      "Rings must not run before entry",
    );
    const geometry = await page.evaluate(() => {
      const logo = document
        .querySelector(".nm-landing-logo")
        .getBoundingClientRect();
      const stage = document
        .querySelector(".nm-landing-globe-stage")
        .getBoundingClientRect();
      const button = document
        .querySelector(".nm-landing-enter")
        .getBoundingClientRect();
      const radius =
        stage.height / (2 * Math.tan((25 * Math.PI) / 180) * Math.sqrt(8));
      return {
        logoOffset: Math.abs((logo.left + logo.right) / 2 - innerWidth / 2),
        globeGap: stage.top + stage.height / 2 - radius - button.bottom,
      };
    });
    assert.ok(geometry.logoOffset <= 1, "Logo must be centered");
    assert.ok(
      geometry.globeGap >= 0 && geometry.globeGap <= 25,
      "Globe must sit close beneath the entry button",
    );
    if (stalledFrames) {
      await page.evaluate(() => {
        window.requestAnimationFrame = () => 0;
      });
    }
    await page.getByRole("button", { name: "Enter Map" }).click();
    if (reducedMotion === "no-preference") {
      await page
        .locator('[data-testid="entry-rings"] canvas')
        .waitFor({ state: "visible" });
      const offset = await page.evaluate(() => {
        const ring = document
          .querySelector('[data-testid="entry-rings"]')
          .getBoundingClientRect();
        const globe = document
          .querySelector(".nm-landing-globe-stage")
          .getBoundingClientRect();
        return Math.hypot(
          (ring.left + ring.right - globe.left - globe.right) / 2,
          (ring.top + ring.bottom - globe.top - globe.bottom) / 2,
        );
      });
      assert.ok(offset <= 1, "Ring origin must match the globe center");
      assert.equal(
        await page.getByRole("button", { name: "Enter Map" }).isDisabled(),
        true,
        "Repeated entry must be blocked",
      );
      await page.evaluate(() =>
        document.querySelector(".nm-landing-enter").click(),
      );
      if (process.env.NETWORK_MAP_LANDING_SCREENSHOT)
        await page.screenshot({
          path: process.env.NETWORK_MAP_LANDING_SCREENSHOT,
        });
    }
    await page
      .locator(".nm-landing")
      .waitFor({ state: "detached", timeout: 12000 });
    await page
      .locator(".app-wrap")
      .waitFor({ state: "visible", timeout: 20000 });
    assert.equal(
      await page.locator(".app-wrap").count(),
      1,
      "Entry must mount the actual map once",
    );
    assert.equal(
      await page.locator('[data-testid="entry-rings"]').count(),
      0,
      "Effect must release its canvas after entry",
    );
    const legacyFontElements = await page.locator(".app-wrap").evaluate((root) =>
      [root, ...root.querySelectorAll("*")]
        .filter((element) => /Inter|IBM Plex/.test(getComputedStyle(element).fontFamily))
        .map((element) => element.tagName + "." + element.className)
        .slice(0, 10),
    );
    assert.deepEqual(legacyFontElements, [], "Map interface has no legacy font overrides");
    await page.close();
  }
  assert.deepEqual(
    errors,
    [],
    "Entry must not raise uncaught JavaScript errors",
  );
  console.log(
    "Landing entry passed: centered logo, tight globe spacing, globe-centered one-shot rings, real map entry, and reduced motion.",
  );
} finally {
  await browser.close();
}
