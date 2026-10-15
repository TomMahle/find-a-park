import { describe, expect, it } from "vitest";
import sample from "../../../assets/parks.sample.json";
import { normalizeParks } from "./normalize";
import { searchParks } from "./search";

const { parks } = normalizeParks(sample);
const ids = (results: { id: string }[]) => results.map((park) => park.id);

describe("searchParks", () => {
  it("returns every park for an empty or blank query", () => {
    expect(searchParks(parks, "")).toBe(parks);
    expect(searchParks(parks, "   ")).toBe(parks);
  });

  it("matches names case-insensitively", () => {
    expect(ids(searchParks(parks, "PROSPECT"))).toEqual(["prospect-park"]);
  });

  it("matches addresses", () => {
    expect(ids(searchParks(parks, "queens"))).toEqual([
      "veterans-memorial-field",
    ]);
  });

  it("matches amenities by label or by slug", () => {
    const bySpace = ids(searchParks(parks, "dog run"));
    expect(bySpace).toEqual(["highland-dog-park", "prospect-park"]);
    expect(ids(searchParks(parks, "dog-run"))).toEqual(bySpace);
    expect(ids(searchParks(parks, "wi-fi"))).toEqual(["central-plaza-green"]);
  });

  it("requires every word to match", () => {
    expect(ids(searchParks(parks, "brooklyn playground"))).toEqual([
      "prospect-park",
    ]);
    expect(searchParks(parks, "brooklyn skate")).toEqual([]);
  });

  it("ignores accents and punctuation in the query", () => {
    expect(ids(searchParks(parks, "Prospéct, park!"))).toEqual([
      "prospect-park",
    ]);
  });

  it("does not search descriptions", () => {
    // Prospect Park's description mentions "Central Park".
    expect(ids(searchParks(parks, "olmsted"))).toEqual([]);
  });

  it("handles parks with no address or amenities", () => {
    const sparse = normalizeParks([{ id: "bare", name: "Bare Lot" }]).parks;
    expect(ids(searchParks(sparse, "bare"))).toEqual(["bare"]);
    expect(searchParks(sparse, "restrooms")).toEqual([]);
  });
});
