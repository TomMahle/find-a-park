import { amenityLabel } from "./amenities";
import type { Park } from "./types";

/**
 * Case- and accent-insensitive search over the fields a resident is likely
 * to type: name, address and amenities (by label, e.g. "dog run", or slug,
 * e.g. "dog-run"). Every word in the query must match somewhere, so
 * "brooklyn playground" narrows rather than widens the results.
 *
 * Descriptions are deliberately not searched: they mention things a park
 * doesn't offer (e.g. "after they completed Central Park"), which would
 * make results feel wrong.
 */
export function searchParks(parks: Park[], query: string): Park[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return parks;

  return parks.filter((park) => {
    const haystack = normalize(
      [
        park.name,
        park.address ?? "",
        ...park.amenities,
        ...park.amenities.map(amenityLabel),
      ].join(" "),
    );
    return words.every((word) => haystack.includes(word));
  });
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}
