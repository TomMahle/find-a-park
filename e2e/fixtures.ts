import { test as base, expect, type Page } from "@playwright/test";

// A 1x1 transparent PNG, served in place of real map tiles.
const BLANK_TILE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

export const TILE_URL_PATTERN = "https://tile.openstreetmap.org/**";

/**
 * Every test runs offline from third parties: map tiles are stubbed (the OSM
 * tile servers must not receive automated traffic, and tests shouldn't
 * depend on them), and the sample data's placeholder image host is blocked,
 * as it is unreachable in real life too.
 */
export const test = base.extend<{ stubExternalRequests: void }>({
  stubExternalRequests: [
    async ({ page }, use) => {
      await page.route(TILE_URL_PATTERN, (route) =>
        route.fulfill({ contentType: "image/png", body: BLANK_TILE }),
      );
      await page.route("https://images.example.com/**", (route) =>
        route.abort(),
      );
      await use();
    },
    { auto: true },
  ],
});

export { expect };

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

/** On phones the map sits behind the List/Map toggle. */
export async function openMapView(page: Page, projectName: string) {
  if (isMobile(projectName)) {
    await page.getByRole("button", { name: "Map", exact: true }).click();
  }
}
