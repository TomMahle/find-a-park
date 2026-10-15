import {
  test as base,
  expect,
  type Locator,
  type Page,
} from "@playwright/test";

// A 1x1 fully transparent PNG, served in place of real map tiles.
const BLANK_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=",
  "base64",
);

export const TILE_URL_PATTERN = "https://tile.openstreetmap.org/**";
export const LISTED_PHOTO_URL_PATTERN = "https://images.example.com/**";
const WIKIMEDIA_PHOTO_URL_PATTERN = "https://thumb.wikimedia.org/**";

/**
 * Every test runs offline from third parties: map tiles and the Wikimedia
 * fallback photos are stubbed (neither should receive automated traffic, and
 * tests shouldn't depend on them), and the sample data's placeholder image
 * host is blocked, as it is unreachable in real life too.
 *
 * E2E_REAL_MEDIA=1 loads real tiles and photos instead; only
 * `pnpm screenshots` uses it.
 */
export const test = base.extend<{ stubExternalRequests: void }>({
  stubExternalRequests: [
    async ({ page }, use) => {
      if (!process.env.E2E_REAL_MEDIA) {
        for (const pattern of [TILE_URL_PATTERN, WIKIMEDIA_PHOTO_URL_PATTERN]) {
          await page.route(pattern, (route) =>
            route.fulfill({ contentType: "image/png", body: BLANK_TILE }),
          );
        }
      }
      await page.route(LISTED_PHOTO_URL_PATTERN, (route) => route.abort());
      await use();
    },
    { auto: true },
  ],
});

export { expect };

/** Makes the sample data's (normally unreachable) photo URLs load. */
export async function serveListedPhotos(page: Page) {
  await page.unroute(LISTED_PHOTO_URL_PATTERN);
  await page.route(LISTED_PHOTO_URL_PATTERN, (route) =>
    route.fulfill({ contentType: "image/png", body: BLANK_TILE }),
  );
}

/** The list's card for a park, found by its heading. */
export function parkCard(page: Page, name: string) {
  return page.getByRole("article", { name });
}

/** A map marker, found by the accessible name the app gives it. */
export function marker(page: Page, name: string) {
  return page.getByRole("button", {
    name: new RegExp(`^${name}\\b.*Show park summary`),
  });
}

export const isMobile = (projectName: string) => projectName === "mobile";

/**
 * Presses Tab, as a keyboard user would, until `target` has focus. Tests use
 * this instead of `locator.focus()`, which would skip proving the element is
 * reachable from the keyboard at all.
 */
export async function tabTo(page: Page, target: Locator, maxPresses = 120) {
  for (let presses = 0; presses < maxPresses; presses++) {
    await page.keyboard.press("Tab");
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
  }
  throw new Error(
    `Not reachable with Tab within ${maxPresses} presses: ${target}`,
  );
}

/** On phones the map sits behind the List/Map toggle. */
export async function openMapView(page: Page, projectName: string) {
  if (isMobile(projectName)) {
    await page.getByRole("button", { name: "Map", exact: true }).click();
  }
}
