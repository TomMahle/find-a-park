import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, openMapView, test, TILE_URL_PATTERN } from "./fixtures";

/**
 * Automated WCAG 2.2 AA checks. These catch a useful subset of problems
 * (contrast, names, roles, landmarks); the keyboard tests in the other
 * specs and manual screen reader testing cover what axe can't.
 */
async function expectNoViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const violations = results.violations
    .map((violation) => ({
      ...violation,
      nodes: violation.nodes.filter(
        (node) => !isAcceptedMarkerOverlap(violation.id, node.html),
      ),
    }))
    .filter((violation) => violation.nodes.length > 0);
  const summary = violations.map(
    (violation) =>
      `${violation.id} (${violation.impact}): ${violation.help}\n  ${violation.nodes
        .slice(0, 3)
        .map((node) => node.target.join(" "))
        .join("\n  ")}`,
  );
  expect(summary).toEqual([]);
}

/**
 * At the zoomed-out city view on a phone, nearby park markers overlap, which
 * axe reports under WCAG 2.5.8 (Target Size). Each marker is a 44x44 target
 * on its own; overlap only happens when parks are close together. 2.5.8's
 * "Equivalent" exception applies: every marker's function ("Show on map",
 * open the park) is also available from the park list, whose controls are
 * at least 44px tall. Only this rule, and only for markers, is accepted.
 */
function isAcceptedMarkerOverlap(ruleId: string, html: string) {
  // axe truncates attribute values in `html`, but this attribute name is
  // only ever set on map markers (see enhanceMarkerElement).
  return ruleId === "target-size" && html.includes(" data-park-id=");
}

for (const colorScheme of ["light", "dark"] as const) {
  test.describe(`${colorScheme} mode`, () => {
    test.use({ colorScheme });

    test("home page (list)", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("list", { name: "Parks" })).toBeVisible();
      await expectNoViolations(page);
    });

    test("home page (map with an open popup)", async ({ page }, testInfo) => {
      await page.goto("/");
      await openMapView(page, testInfo.project.name);
      await expect(page.locator(".park-marker")).toHaveCount(12);
      await page.locator('.park-marker[data-park-id="prospect-park"]').focus();
      await page.keyboard.press("Enter");
      await expect(
        page.getByRole("link", { name: /View park details/ }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test("home page (search with no results)", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Search parks").fill("volcano");
      await expect(page.getByText(/No parks match/)).toBeVisible();
      await expectNoViolations(page);
    });

    test("details page with full data", async ({ page }) => {
      await page.goto("/parks/prospect-park");
      // Wait for the fallback photos (the listing's own photos never load).
      await expect(
        page.getByRole("img", { name: /Prospect Park Boathouse/ }),
      ).toBeVisible();
      await expectNoViolations(page);
    });

    test("details page with missing data", async ({ page }) => {
      await page.goto("/parks/cedar-hill-nature-preserve");
      await expectNoViolations(page);
    });

    test("not found page", async ({ page }) => {
      await page.goto("/parks/no-such-park");
      await expectNoViolations(page);
    });
  });
}

test.describe("reflow at 320 CSS pixels (WCAG 1.4.10, ~400% zoom)", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const path of [
    "/",
    "/parks/prospect-park",
    "/parks/highland-dog-park",
    "/parks/no-such-park",
  ]) {
    test(`${path} has no horizontal scrolling`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("failure and selection states", () => {
  test("home page with a selected park and the tile-failure notice", async ({
    page,
    isMobile,
  }) => {
    await page.unroute(TILE_URL_PATTERN);
    await page.route(TILE_URL_PATTERN, (route) => route.abort());
    await page.goto("/");
    await page
      .getByRole("button", { name: "Show on map: Prospect Park" })
      .click();
    await expect(
      page.getByText("The map background couldn’t load."),
    ).toBeVisible();
    // Scan the map with its notice, then (on phones) the list, whose card for
    // the selected park is highlighted.
    await expectNoViolations(page);
    if (isMobile) {
      await page.getByRole("button", { name: "List", exact: true }).click();
      await expectNoViolations(page);
    }
  });
});
