import { describe, expect, it } from "vitest";
import {
  amenityLabel,
  directionsUrl,
  formatAcreage,
  formatRating,
} from "./format";

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

describe("formatAcreage", () => {
  it("pluralizes and groups thousands", () => {
    expect(formatAcreage(1)).toBe("1 acre");
    expect(formatAcreage(2.25)).toBe("2.3 acres");
    expect(formatAcreage(1640)).toBe("1,640 acres");
  });
});

describe("formatRating", () => {
  it("always shows one decimal place", () => {
    expect(formatRating(4)).toBe("4.0 out of 5");
    expect(formatRating(4.75)).toBe("4.8 out of 5");
  });
});

describe("directionsUrl", () => {
  it("builds a keyless Google Maps directions link", () => {
    expect(directionsUrl(40.66, -73.969)).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=40.66%2C-73.969",
    );
  });
});
