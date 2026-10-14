import { expect, isMobile, marker, openMapView, test } from "./fixtures";

/**
 * Regression tests for problems found in review. Each describes the bug it
 * guards against.
 */

test("going Back doesn't replay an earlier “Show on map”", async ({
  page,
}, testInfo) => {
  // React re-runs effects when Next.js re-shows the hidden home page, which
  // used to jump the map back to the last "Show on map" park.
  await page.goto("/");
  await page
    .getByRole("button", { name: "Show on map: Prospect Park" })
    .click();
  await expect(
    page.getByRole("link", { name: "View park details: Prospect Park" }),
  ).toBeFocused();

  // Then pick a different park on the map and open it.
  await page.keyboard.press("Escape");
  await openMapView(page, testInfo.project.name);
  await marker(page, "Riverside Commons").focus();
  await page.keyboard.press("Enter");
  // Selecting a marker smooth-scrolls the list to its card, which moves the
  // page for a moment; use the keyboard (the link has focus) not a click.
  await expect(
    page.getByRole("link", { name: "View park details: Riverside Commons" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/parks\/riverside-commons$/);

  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "Find a park" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "View park details: Prospect Park" }),
  ).toHaveCount(0);
  await expect(
    page.locator('[data-park-card="prospect-park"]'),
  ).not.toHaveAttribute("class", /border-accent/);
});

test("focus moves to the new page's heading, and back to the park on return", async ({
  page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "uses the desktop list and map");
  await page.goto("/");
  const link = page.getByRole("link", { name: "Lakeshore Point" });
  await link.focus();
  await page.keyboard.press("Enter");

  await expect(page).toHaveURL(/\/parks\/lakeshore-point$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Lakeshore Point" }),
  ).toBeFocused();

  await page.goBack();
  await expect(link).toBeFocused();
});

test("searching away the selected park clears the selection", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Show on map: Prospect Park" })
    .click();
  await expect(
    page.locator('[data-park-card="prospect-park"]'),
  ).toHaveAttribute("class", /border-accent/);

  await page.getByLabel("Search parks").fill("skate");
  await page.getByLabel("Search parks").fill("");
  await expect(
    page.locator('[data-park-card="prospect-park"]'),
  ).not.toHaveAttribute("class", /border-accent/);
  await expect(page.locator(".park-marker--selected")).toHaveCount(0);
});

test("markers sit exactly on their park's location", async ({
  page,
}, testInfo) => {
  // Leaflet's display:block used to override the pin's centering, drawing
  // the tip a few pixels off the coordinates.
  await page.goto("/");
  await openMapView(page, testInfo.project.name);
  const box = await page
    .locator('.park-marker[data-park-id="prospect-park"]')
    .boundingBox();
  const tip = await page
    .locator('.park-marker[data-park-id="prospect-park"] svg')
    .boundingBox();
  expect(box && tip).toBeTruthy();
  // Pin is horizontally centered and its tip is at the anchor (22, 42).
  expect(Math.abs(tip!.x + tip!.width / 2 - (box!.x + 22))).toBeLessThan(1);
  expect(Math.abs(tip!.y + tip!.height - (box!.y + 44))).toBeLessThan(1);
});

test.describe("on a 320px-wide screen", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test("a park's popup fits inside the map", async ({ page }) => {
    await page.goto("/");
    await page
      .getByRole("button", { name: "Show on map: Veterans Memorial Field" })
      .click();
    const popup = page.locator(".leaflet-popup");
    await expect(popup).toBeVisible();
    await page.waitForTimeout(500); // let auto-pan finish
    const map = await page.locator(".leaflet-container").boundingBox();
    const box = await popup.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(map!.x);
    expect(box!.x + box!.width).toBeLessThanOrEqual(map!.x + map!.width);
  });
});

test("the map itself is named and explains its keyboard controls", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await openMapView(page, testInfo.project.name);
  const map = page.getByRole("group", { name: "Map of parks" });
  await expect(map).toBeVisible();
  await expect(map).toHaveAccessibleDescription(/arrow keys move it/);
});

test("“Show on map” centers the park even when the map is already zoomed in", async ({
  page,
}, testInfo) => {
  // Opening the popup after an animated pan used to stop the pan partway
  // (Leaflet's popup auto-pan cancels it), leaving the park off-center.
  test.skip(isMobile(testInfo.project.name), "needs both list and map visible");
  await page.goto("/");
  await page
    .getByRole("button", { name: "Show on map: Prospect Park" })
    .click();
  await page.waitForTimeout(1000);
  await page
    .getByRole("button", { name: "Show on map: Willow Creek Wetlands" })
    .click();
  await page.waitForTimeout(1000); // let the pan animation finish

  const map = (await page.locator(".leaflet-container").boundingBox())!;
  const pin = (await page
    .locator('.park-marker[data-park-id="willow-creek-wetlands"]')
    .boundingBox())!;
  const tipX = pin.x + 22;
  const tipY = pin.y + 42;
  expect(Math.abs(tipX - (map.x + map.width / 2))).toBeLessThan(5);
  expect(Math.abs(tipY - (map.y + map.height / 2))).toBeLessThan(5);
});

test("clicking a park's card centers it on the map at the current zoom", async ({
  page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "list and map side by side only");
  await page.goto("/");
  await expect(page.locator(".park-marker")).toHaveCount(12);
  const zoom = () =>
    page
      .locator(".leaflet-tile")
      .first()
      .getAttribute("src")
      .then((src) => src?.split("/").at(-3));
  const zoomBefore = await zoom();

  // Click the card itself (its address), not its links or buttons.
  await page
    .locator('[data-park-card="willow-creek-wetlands"]')
    .getByText("Creek Rd")
    .click();
  await expect(
    page.locator('[data-park-card="willow-creek-wetlands"]'),
  ).toHaveAttribute("class", /border-accent/);
  await expect(page.locator(".park-marker--selected")).toHaveCount(1);
  await expect(page.locator(".leaflet-popup")).toHaveCount(0);
  await page.waitForTimeout(600); // let the pan finish

  const map = (await page.locator(".leaflet-container").boundingBox())!;
  const pin = (await page
    .locator('.park-marker[data-park-id="willow-creek-wetlands"]')
    .boundingBox())!;
  expect(Math.abs(pin.x + 22 - (map.x + map.width / 2))).toBeLessThan(5);
  expect(Math.abs(pin.y + 42 - (map.y + map.height / 2))).toBeLessThan(5);
  expect(await zoom()).toBe(zoomBefore);
});
