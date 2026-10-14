import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, openMapView, test } from "./fixtures";

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
      await expect(page.getByRole("img", { name: /unavailable/ })).toHaveCount(
        2,
      );
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
