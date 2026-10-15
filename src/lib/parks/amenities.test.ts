import { describe, expect, it } from "vitest";
import { amenityLabel, orderAmenities } from "./amenities";

describe("amenityLabel", () => {
  it("uses curated labels where sentence case reads badly", () => {
    expect(amenityLabel("wifi")).toBe("Wi-Fi");
    expect(amenityLabel("dog-run")).toBe("Dog run");
  });

  it("falls back to sentence case for unknown slugs", () => {
    expect(amenityLabel("ice-skating_rink")).toBe("Ice skating rink");
    expect(amenityLabel("lake")).toBe("Lake");
  });
});

describe("orderAmenities", () => {
  it("moves restrooms and parking to the end, restrooms first", () => {
    expect(
      orderAmenities(["parking", "playground", "restrooms", "dog-run", "lake"]),
    ).toEqual(["playground", "dog-run", "lake", "restrooms", "parking"]);
  });

  it("keeps the data's order for everything else", () => {
    expect(orderAmenities(["trails", "gardens", "cafe"])).toEqual([
      "trails",
      "gardens",
      "cafe",
    ]);
  });

  it("handles parks with only low-priority or no amenities", () => {
    expect(orderAmenities(["parking", "restrooms"])).toEqual([
      "restrooms",
      "parking",
    ]);
    expect(orderAmenities([])).toEqual([]);
  });
});
