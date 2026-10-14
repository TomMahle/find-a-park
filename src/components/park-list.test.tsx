import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Park } from "@/lib/parks/types";
import { ParkList } from "./park-list";

const full: Park = {
  id: "full-park",
  name: "Full Park",
  description: "Lots of everything.",
  coordinates: { lat: 40.7, lng: -73.9 },
  address: "1 Main St",
  amenities: ["playground", "dog-run", "trails", "restrooms", "wifi", "lake"],
  hours: "6:00 AM - 10:00 PM",
  images: [],
  acreage: 12,
  rating: 4.25,
};

const sparse: Park = {
  id: "sparse-park",
  name: "Sparse Park",
  description: null,
  coordinates: null,
  address: null,
  amenities: [],
  hours: null,
  images: [],
  acreage: null,
  rating: null,
};

function renderList(onShowOnMap = vi.fn(), onCenterOnMap = vi.fn()) {
  render(
    <ParkList
      parks={[full, sparse]}
      selectedId={null}
      onShowOnMap={onShowOnMap}
      onCenterOnMap={onCenterOnMap}
    />,
  );
  return {
    full: screen.getByRole("article", { name: "Full Park" }),
    sparse: screen.getByRole("article", { name: "Sparse Park" }),
  };
}

describe("ParkList", () => {
  it("links each park name to its details page", () => {
    const { full } = renderList();
    expect(
      within(full).getByRole("link", { name: "Full Park" }),
    ).toHaveAttribute("href", "/parks/full-park");
  });

  it("summarizes a park's details and limits the amenity chips", () => {
    const { full } = renderList();
    expect(full).toHaveTextContent("1 Main St");
    expect(full).toHaveTextContent("4.3 out of 5");
    expect(full).toHaveTextContent("12 acres");
    const amenities = within(full).getByRole("list", { name: "Amenities" });
    // Four chips plus the "+2 more" button.
    expect(within(amenities).getAllByRole("listitem")).toHaveLength(5);
    expect(amenities).not.toHaveTextContent("Lake");
  });

  it("expands and collapses the remaining amenities in place", async () => {
    const { full } = renderList();
    const amenities = within(full).getByRole("list", { name: "Amenities" });
    const more = within(full).getByRole("button", {
      name: "+2 more amenities",
    });
    expect(more).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(more);
    expect(amenities).toHaveTextContent("Lake");
    expect(within(amenities).getAllByRole("listitem")).toHaveLength(7);
    const fewer = within(full).getByRole("button", {
      name: "Show fewer amenities",
    });
    expect(fewer).toHaveAttribute("aria-expanded", "true");
    expect(fewer).toHaveFocus();

    await userEvent.click(fewer);
    expect(amenities).not.toHaveTextContent("Lake");
  });

  it("shows a sparse park without inventing details", () => {
    const { sparse } = renderList();
    expect(sparse).toHaveTextContent("Address not listed");
    expect(sparse).toHaveTextContent("isn’t on the map");
    expect(sparse).not.toHaveTextContent("out of 5");
    expect(
      within(sparse).queryByRole("list", { name: "Amenities" }),
    ).toBeNull();
    expect(within(sparse).queryByRole("button")).toBeNull();
  });

  it("centers a park when its card is clicked, but not via its controls", async () => {
    const onShowOnMap = vi.fn();
    const onCenterOnMap = vi.fn();
    const { full, sparse } = renderList(onShowOnMap, onCenterOnMap);

    await userEvent.click(within(full).getByText("1 Main St"));
    expect(onCenterOnMap).toHaveBeenCalledWith("full-park");

    onCenterOnMap.mockClear();
    await userEvent.click(
      within(full).getByRole("button", { name: /Show on map/ }),
    );
    await userEvent.click(
      within(full).getByRole("button", { name: /more amenities/ }),
    );
    expect(onCenterOnMap).not.toHaveBeenCalled();

    // A park with no location has nothing to center on.
    await userEvent.click(within(sparse).getByText("Address not listed"));
    expect(onCenterOnMap).not.toHaveBeenCalled();
  });

  it("asks to show the park on the map", async () => {
    const onShowOnMap = vi.fn();
    const { full } = renderList(onShowOnMap);
    await userEvent.click(
      within(full).getByRole("button", { name: "Show on map: Full Park" }),
    );
    expect(onShowOnMap).toHaveBeenCalledWith("full-park");
  });
});
