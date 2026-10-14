import { describe, expect, it } from "vitest";
import { directionsUrl, formatAcreage, formatRating } from "./format";

describe("formatAcreage", () => {
  it("pluralizes and groups thousands", () => {
    expect(formatAcreage(1)).toBe("1 acre");
    expect(formatAcreage(1.04)).toBe("1 acre");
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
