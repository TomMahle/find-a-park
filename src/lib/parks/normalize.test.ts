import { describe, expect, it } from "vitest";
import sample from "../../../assets/parks.sample.json";
import { normalizeParks } from "./normalize";

const minimal = { id: "a-park", name: "A Park" };

function normalizeOne(record: Record<string, unknown>) {
  const { parks, warnings } = normalizeParks([record]);
  return { park: parks[0], warnings };
}

describe("normalizeParks", () => {
  describe("with the supplied sample data", () => {
    const { parks, warnings } = normalizeParks(sample);

    it("keeps every park and reports no problems", () => {
      expect(parks).toHaveLength(sample.length);
      expect(warnings).toEqual([]);
    });

    it("sorts parks alphabetically by name", () => {
      const names = parks.map((park) => park.name);
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });

    it("turns the sample's gaps into explicit nulls and empty lists", () => {
      const byId = Object.fromEntries(parks.map((park) => [park.id, park]));
      expect(byId["old-mill-botanical-garden"].description).toBeNull();
      expect(byId["highland-dog-park"].address).toBeNull();
      expect(byId["highland-dog-park"].coordinates).toEqual({
        lat: 40.6789,
        lng: -73.9442,
      });
      expect(byId["cedar-hill-nature-preserve"].rating).toBeNull();
      expect(byId["cedar-hill-nature-preserve"].images).toEqual([]);
    });
  });

  it("fills every optional field with null or [] for a minimal record", () => {
    expect(normalizeOne(minimal)).toEqual({
      park: {
        id: "a-park",
        name: "A Park",
        description: null,
        coordinates: null,
        address: null,
        amenities: [],
        hours: null,
        images: [],
        acreage: null,
        rating: null,
      },
      warnings: [],
    });
  });

  it("trims text and treats blank strings as missing", () => {
    const { park } = normalizeOne({
      ...minimal,
      name: "  Spaced Park  ",
      description: "   ",
      hours: "",
      location: { address: "\t" },
    });
    expect(park.name).toBe("Spaced Park");
    expect(park.description).toBeNull();
    expect(park.hours).toBeNull();
    expect(park.address).toBeNull();
  });

  it("returns no parks and a warning when the data is not an array", () => {
    expect(normalizeParks({ parks: [] })).toEqual({
      parks: [],
      warnings: ["Park data is not an array."],
    });
  });

  it.each([
    ["not an object", "just a string"],
    ["no id", { name: "No Id" }],
    ["an id that is not URL-safe", { id: "has spaces/slash", name: "Bad" }],
    ["no name", { id: "no-name", name: " " }],
  ])("skips a record with %s and says why", (_case, record) => {
    const { parks, warnings } = normalizeParks([record]);
    expect(parks).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/^Park #0.*skipped/);
  });

  it("keeps the first of two records with the same id", () => {
    const { parks, warnings } = normalizeParks([
      { id: "twin", name: "First" },
      { id: "twin", name: "Second" },
    ]);
    expect(parks.map((park) => park.name)).toEqual(["First"]);
    expect(warnings).toEqual([
      'Park #1: skipped because id "twin" is a duplicate.',
    ]);
  });

  describe("coordinates", () => {
    it("accepts valid coordinates", () => {
      const { park } = normalizeOne({
        ...minimal,
        location: { lat: 40.5, lng: -73.9 },
      });
      expect(park.coordinates).toEqual({ lat: 40.5, lng: -73.9 });
    });

    it.each([
      ["out of range", { lat: 91, lng: 0.5 }],
      ["not numbers", { lat: "40.5", lng: "-73.9" }],
      ["half missing", { lat: 40.5 }],
      ["the (0, 0) placeholder", { lat: 0, lng: 0 }],
      ["not finite", { lat: Number.NaN, lng: 1 }],
    ])("drops coordinates that are %s, with a warning", (_case, location) => {
      const { park, warnings } = normalizeOne({ ...minimal, location });
      expect(park.coordinates).toBeNull();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("will not appear on the map");
    });

    it("keeps the address even when coordinates are missing", () => {
      const { park, warnings } = normalizeOne({
        ...minimal,
        location: { address: "1 Main St" },
      });
      expect(park.address).toBe("1 Main St");
      expect(park.coordinates).toBeNull();
      expect(warnings).toEqual([]);
    });
  });

  it("de-duplicates amenities and drops blank or non-string entries", () => {
    const { park, warnings } = normalizeOne({
      ...minimal,
      amenities: ["trails", " trails ", "", 42, "restrooms"],
    });
    expect(park.amenities).toEqual(["trails", "restrooms"]);
    expect(warnings).toEqual([
      '"a-park": ignored 2 empty or invalid amenities.',
    ]);
  });

  it("drops amenities that have no letters or digits", () => {
    const { park, warnings } = normalizeOne({
      ...minimal,
      amenities: ["-", "trails"],
    });
    expect(park.amenities).toEqual(["trails"]);
    expect(warnings).toEqual([
      '"a-park": ignored amenity "-" because it has no words.',
    ]);
  });

  it("warns about text fields that hold something other than text", () => {
    const { park, warnings } = normalizeOne({
      ...minimal,
      hours: { open: "9", close: "5" },
      description: 42,
    });
    expect(park.hours).toBeNull();
    expect(park.description).toBeNull();
    expect(warnings).toEqual([
      '"a-park": ignored description because it is not text.',
      '"a-park": ignored hours because it is not text.',
    ]);
  });

  it("ignores a non-list amenities value", () => {
    const { park, warnings } = normalizeOne({
      ...minimal,
      amenities: "trails",
    });
    expect(park.amenities).toEqual([]);
    expect(warnings).toHaveLength(1);
  });

  it("keeps only absolute http(s) image URLs", () => {
    const { park, warnings } = normalizeOne({
      ...minimal,
      images: [
        "https://example.com/a.jpg",
        "http://example.com/b.jpg",
        "/relative.jpg",
        "javascript:alert(1)",
      ],
    });
    expect(park.images).toEqual([
      "https://example.com/a.jpg",
      "http://example.com/b.jpg",
    ]);
    expect(warnings).toHaveLength(2);
  });

  it.each([
    ["rating", 5.5],
    ["rating", -1],
    ["rating", "4.5"],
    ["acreage", 0],
    ["acreage", -3],
    ["acreage", Number.POSITIVE_INFINITY],
  ])("drops an invalid %s value of %j", (field, value) => {
    const { park, warnings } = normalizeOne({ ...minimal, [field]: value });
    expect(park[field as "rating" | "acreage"]).toBeNull();
    expect(warnings).toHaveLength(1);
  });

  it("accepts boundary ratings of 0 and 5", () => {
    expect(normalizeOne({ ...minimal, rating: 0 }).park.rating).toBe(0);
    expect(normalizeOne({ ...minimal, rating: 5 }).park.rating).toBe(5);
  });
});
