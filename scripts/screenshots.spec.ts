/**
 * Regenerates the screenshots in docs/screenshots (used by the README).
 * Run with `pnpm screenshots`. Not part of the test suite.
 */
import type { Page } from "@playwright/test";
import { expect, test } from "../e2e/fixtures";

/** Waits until every visible map tile has loaded and finished fading in. */
async function waitForMapToSettle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(() => {
    const tiles = [...document.querySelectorAll<HTMLElement>(".leaflet-tile")];
    return (
      tiles.length > 0 &&
      tiles.every(
        (tile) =>
          tile.classList.contains("leaflet-tile-loaded") &&
          getComputedStyle(tile).opacity === "1",
      ) &&
      !document.querySelector(".leaflet-zoom-anim")
    );
  });
  await page.waitForTimeout(300); // one more beat for marker and popup paint
}

const OUT = "docs/screenshots";

const sizes = {
  desktop: { width: 1280, height: 800 },
  phone: { width: 390, height: 844 },
} as const;

for (const [device, viewport] of Object.entries(sizes)) {
  for (const colorScheme of ["light", "dark"] as const) {
    test.describe(`${device} ${colorScheme}`, () => {
      test.use({ viewport, colorScheme });

      test("home", async ({ page }) => {
        await page.goto("/");
        if (device === "phone") {
          await page.screenshot({
            path: `${OUT}/${device}-${colorScheme}-list.png`,
          });
        }
        // On phones this also switches from the list to the map.
        await page
          .getByRole("button", { name: "Show on map: Prospect Park" })
          .click();
        await expect(page.locator(".park-marker")).toHaveCount(12);
        await expect(
          page.getByRole("link", { name: /View park details/ }),
        ).toBeVisible();
        await waitForMapToSettle(page);
        await page.screenshot({
          path: `${OUT}/${device}-${colorScheme}-map.png`,
        });
      });

      test("details", async ({ page }) => {
        await page.goto("/parks/prospect-park");
        await expect(
          page.getByRole("img", { name: /Prospect Park Boathouse/ }),
        ).toBeVisible();
        await waitForMapToSettle(page); // the location preview
        await page.screenshot({
          path: `${OUT}/${device}-${colorScheme}-details.png`,
          fullPage: true,
        });
      });
    });
  }
}
