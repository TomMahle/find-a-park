/**
 * Regenerates the screenshots in docs/screenshots (used by the README).
 * Run with `pnpm screenshots`. Not part of the test suite.
 */
import { expect, test } from "../e2e/fixtures";

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
        await page.waitForTimeout(400); // let the pan animation settle
        await page.screenshot({
          path: `${OUT}/${device}-${colorScheme}-map.png`,
        });
      });

      test("details", async ({ page }) => {
        await page.goto("/parks/prospect-park");
        await expect(
          page.getByRole("img", { name: /unavailable/ }),
        ).toHaveCount(2);
        await page.screenshot({
          path: `${OUT}/${device}-${colorScheme}-details.png`,
          fullPage: true,
        });
      });
    });
  }
}
