import { describe, expect, it } from "vitest";
import { fallbackPhotosFor } from "./fallback-photos";

describe("fallbackPhotosFor", () => {
  it("returns credited photos for a verified real park", () => {
    const photos = fallbackPhotosFor({
      id: "prospect-park",
      name: "Prospect Park",
    });
    expect(photos.length).toBeGreaterThan(0);
    for (const photo of photos) {
      expect(photo.src).toMatch(/^https:\/\//);
      expect(photo.alt.length).toBeGreaterThan(20);
      expect(photo.credit.author).not.toBe("");
      expect(photo.credit.licenseUrl).toMatch(/creativecommons\.org/);
      expect(photo.credit.sourceUrl).toMatch(/commons\.wikimedia\.org/);
    }
  });

  it("returns nothing if the id is reused for a differently named park", () => {
    expect(
      fallbackPhotosFor({ id: "prospect-park", name: "Prospect Plaza" }),
    ).toEqual([]);
  });

  it("returns nothing for parks without an entry, including prototype keys", () => {
    expect(
      fallbackPhotosFor({ id: "sunset-playground", name: "Sunset Playground" }),
    ).toEqual([]);
    expect(
      fallbackPhotosFor({ id: "constructor", name: "constructor" }),
    ).toEqual([]);
  });
});
