// Exercise the real entry path before existing map acceptance checks.
export async function enterNetworkMap(page) {
  await page
    .locator(".nm-landing, .app-wrap")
    .first()
    .waitFor({ state: "visible", timeout: 30000 });
  const enter = page.getByRole("button", { name: "Enter Map", exact: false });
  if (await enter.isVisible()) {
    await enter.click();
    await page
      .locator(".nm-landing")
      .waitFor({ state: "detached", timeout: 12000 });
  }
}
