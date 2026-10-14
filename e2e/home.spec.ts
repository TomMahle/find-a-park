import {
  expect,
  isMobile,
  marker,
  openMapView,
  parkCard,
  test,
  TILE_URL_PATTERN,
} from "./fixtures";

test.describe("home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("lists every park alphabetically", async ({ page }) => {
    await expect(page).toHaveTitle("Find a Park · New York City");
    await expect(
      page.getByRole("heading", { level: 1, name: "Find a park" }),
    ).toBeVisible();

    const names = await page
      .getByRole("list", { name: "Parks" })
      .getByRole("heading", { level: 2 })
      .allTextContents();
    expect(names).toHaveLength(12);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    await expect(page.getByRole("status").first()).toHaveText(
      "Showing all 12 parks",
    );
  });

  test("shows missing information honestly on cards", async ({ page }) => {
    await expect(parkCard(page, "Highland Dog Park")).toContainText(
      "Address not listed",
    );
    // Cedar Hill has no rating, so its card shows none rather than a guess.
    await expect(
      parkCard(page, "Cedar Hill Nature Preserve"),
    ).not.toContainText("out of 5");
  });

  test("a keyboard user can open a park's details from the list", async ({
    page,
  }) => {
    const target = page.getByRole("link", { name: "Prospect Park" });

    // Tab from the top of the page, as a keyboard user would.
    let reached = false;
    for (let presses = 0; presses < 80 && !reached; presses++) {
      await page.keyboard.press("Tab");
      reached = await target.evaluate(
        (link) => link === document.activeElement,
      );
    }
    expect(reached, "Prospect Park link should be reachable with Tab").toBe(
      true,
    );

    // The focus indicator is visible.
    const outline = await target.evaluate((link) => {
      const style = getComputedStyle(link);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/parks\/prospect-park$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Prospect Park" }),
    ).toBeVisible();
  });

  test("the skip link jumps to the main content", async ({ page }) => {
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page.locator("#main")).toBeFocused();
  });

  test("“Show on map” opens the park's popup and returns focus on Escape", async ({
    page,
  }, testInfo) => {
    const button = page.getByRole("button", {
      name: "Show on map: Prospect Park",
    });
    await button.click();

    const details = page.getByRole("link", {
      name: "View park details: Prospect Park",
    });
    await expect(details).toBeVisible();
    await expect(details).toBeFocused();
    // The matching card is highlighted (checked by attribute, because on
    // phones the list is hidden while the map is showing).
    await expect(
      page.locator('[data-park-card="prospect-park"]'),
    ).toHaveAttribute("class", /border-accent/);

    await page.keyboard.press("Escape");
    await expect(details).toBeHidden();
    if (isMobile(testInfo.project.name)) {
      // The list is hidden behind the map on phones, so focus goes to the marker.
      await expect(marker(page, "Prospect Park")).toBeFocused();
    } else {
      await expect(button).toBeFocused();
    }
  });

  test("map markers work with the keyboard", async ({ page }, testInfo) => {
    await openMapView(page, testInfo.project.name);
    await expect(page.locator(".park-marker")).toHaveCount(12);

    const pin = marker(page, "Central Plaza Green");
    await pin.focus();
    await page.keyboard.press("Enter");
    const details = page.getByRole("link", {
      name: "View park details: Central Plaza Green",
    });
    await expect(details).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(details).toBeHidden();
    await expect(pin).toBeFocused();

    // Space works too, as on a native button, including on a second open.
    await page.keyboard.press(" ");
    await expect(details).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/parks\/central-plaza-green$/);
  });

  test("search filters the list and the map together", async ({
    page,
  }, testInfo) => {
    await page.getByLabel("Search parks").fill("dog run");
    await expect(page.getByRole("status").first()).toHaveText(
      "Showing 2 of 12 parks",
    );
    await expect(
      page.getByRole("list", { name: "Parks" }).getByRole("article"),
    ).toHaveCount(2);

    await openMapView(page, testInfo.project.name);
    await expect(page.locator(".park-marker")).toHaveCount(2);
  });

  test("a search with no matches explains itself and can be cleared", async ({
    page,
  }) => {
    await page.getByLabel("Search parks").fill("volcano");
    await expect(page.getByText(/No parks match/)).toBeVisible();
    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(page.getByLabel("Search parks")).toHaveValue("");
    await expect(
      page.getByRole("list", { name: "Parks" }).getByRole("article"),
    ).toHaveCount(12);
  });

  test("the map still works after visiting a park and going back", async ({
    page,
  }, testInfo) => {
    // Regression test: Next.js keeps the home page mounted but hidden while
    // you're on another page; react-leaflet's MapContainer crashed on return.
    await openMapView(page, testInfo.project.name);
    await expect(page.locator(".park-marker")).toHaveCount(12);

    // Leave through the map popup, which works in both layouts.
    await marker(page, "Prospect Park").focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("link", { name: "View park details: Prospect Park" })
      .click();
    await expect(page).toHaveURL(/\/parks\/prospect-park$/);

    await page.goBack();
    await expect(
      page.getByRole("heading", { name: "Find a park" }),
    ).toBeVisible();
    await openMapView(page, testInfo.project.name);
    await expect(page.locator(".park-marker")).toHaveCount(12);
    await expect(page.getByText("The map couldn’t be loaded")).toHaveCount(0);
  });
});

test.describe("phone layout", () => {
  // Playwright's built-in `isMobile` fixture is true for the phone project.
  test.skip(({ isMobile: mobile }) => !mobile, "phones only");

  test("shows the list first and the map on request", async ({ page }) => {
    await page.goto("/");
    const list = page.getByRole("list", { name: "Parks" });
    const map = page.locator(".park-map");

    await expect(list).toBeVisible();
    await expect(map).toHaveCount(0); // not even loaded until it's needed

    await page.getByRole("button", { name: "Map", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Map", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await expect(map).toBeVisible();
    await expect(list).toBeHidden();
  });
});

test.describe("when the map can't load", () => {
  test("map tiles failing shows a notice and the list keeps working", async ({
    page,
  }, testInfo) => {
    await page.unroute(TILE_URL_PATTERN);
    await page.route(TILE_URL_PATTERN, (route) => route.abort());
    await page.goto("/");
    await openMapView(page, testInfo.project.name);

    await expect(
      page.getByText("The map background couldn’t load."),
    ).toBeVisible();
    // Markers still render on the blank map.
    await expect(page.locator(".park-marker")).toHaveCount(12);
  });

  test("the map code failing to load leaves the list usable", async ({
    page,
  }, testInfo) => {
    // Production chunk names are hashed, so find the map's chunk by content:
    // fail any script that contains Leaflet.
    await page.route("**/_next/static/chunks/*.js", async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (body.includes("leaflet-container")) await route.abort();
      else await route.fulfill({ response, body });
    });
    await page.goto("/");
    await openMapView(page, testInfo.project.name);

    await expect(page.getByText("The map couldn’t be loaded.")).toBeVisible();
    if (!isMobile(testInfo.project.name)) {
      await page.getByRole("link", { name: "Prospect Park" }).click();
      await expect(page).toHaveURL(/\/parks\/prospect-park$/);
    }
  });
});
