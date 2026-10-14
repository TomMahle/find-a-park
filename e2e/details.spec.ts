import { expect, test } from "./fixtures";

test.describe("park details page", () => {
  test("shows everything known about a park", async ({ page }) => {
    await page.goto("/parks/prospect-park");

    await expect(page).toHaveTitle("Prospect Park · Find a Park");
    await expect(
      page.getByRole("heading", { level: 1, name: "Prospect Park" }),
    ).toBeVisible();
    await expect(
      page.getByText(/526-acre park in the heart of Brooklyn/),
    ).toBeVisible();

    const visit = page.getByRole("region", { name: "Plan your visit" });
    await expect(visit).toContainText("6:00 AM - 1:00 AM");
    await expect(visit).toContainText("Brooklyn, NY 11225");
    await expect(visit).toContainText("526 acres");
    await expect(visit).toContainText("4.7 out of 5");

    for (const amenity of ["Playground", "Dog run", "Picnic areas"]) {
      await expect(
        page.getByRole("listitem").filter({ hasText: amenity }),
      ).toBeVisible();
    }

    const directions = page.getByRole("link", { name: /Get directions/ });
    await expect(directions).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=40.6602%2C-73.969",
    );
    await expect(directions).toHaveAttribute("target", "_blank");
  });

  test("says when information isn't listed instead of inventing it", async ({
    page,
  }) => {
    // No description in the data.
    await page.goto("/parks/old-mill-botanical-garden");
    await expect(page.getByText("No description available.")).toBeVisible();

    // No address in the data.
    await page.goto("/parks/highland-dog-park");
    const visit = page.getByRole("region", { name: "Plan your visit" });
    await expect(visit.getByText("Not listed")).toHaveCount(1);
    await expect(visit).toContainText("Address");

    // No rating and no photos in the data.
    await page.goto("/parks/cedar-hill-nature-preserve");
    await expect(page.getByText("No photos available.")).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Plan your visit" }),
    ).not.toContainText("out of 5");
  });

  test("replaces photos that fail to load with a labeled placeholder", async ({
    page,
  }) => {
    await page.goto("/parks/old-mill-botanical-garden");
    const placeholders = page.getByRole("img", { name: /unavailable/ });
    await expect(placeholders).toHaveCount(2);
    await expect(placeholders.first()).toHaveAccessibleName(
      "Old Mill Botanical Garden, photo 1 of 2 (unavailable)",
    );
  });

  test("“All parks” returns to the list", async ({ page }) => {
    await page.goto("/parks/lakeshore-point");
    await page.getByRole("link", { name: "All parks" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole("heading", { name: "Find a park" }),
    ).toBeVisible();
  });

  test("an unknown park returns a real 404 page", async ({ page }) => {
    const response = await page.goto("/parks/no-such-park");
    expect(response?.status()).toBe(404);
    await expect(
      page.getByRole("heading", { name: "We couldn’t find that page" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Browse all parks" }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
