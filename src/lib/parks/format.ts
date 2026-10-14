/** Human-readable labels for amenity slugs that don't read well title-cased. */
const AMENITY_LABELS: Record<string, string> = {
  wifi: "Wi-Fi",
  "dog-run": "Dog run",
  "bike-path": "Bike path",
  "splash-pad": "Splash pad",
  "skate-park": "Skate park",
  "kayak-launch": "Kayak launch",
  "event-lawn": "Event lawn",
  "gift-shop": "Gift shop",
  "food-vendors": "Food vendors",
  "picnic-areas": "Picnic areas",
  "sports-fields": "Sports fields",
  "water-fountain": "Water fountain",
  "wildlife-viewing": "Wildlife viewing",
  "accessible-paths": "Accessible paths",
};

/** `"dog-run"` → `"Dog run"`; unknown slugs fall back to sentence case. */
export function amenityLabel(slug: string): string {
  // Slugs are normalized to contain at least one letter or digit, so this
  // never returns an empty label.
  const known = AMENITY_LABELS[slug];
  if (known) return known;
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function formatAcreage(acres: number): string {
  const value = acres.toLocaleString("en-US", { maximumFractionDigits: 1 });
  // Pluralize what's shown: 1.04 displays as "1", so "1 acre".
  return `${value} ${value === "1" ? "acre" : "acres"}`;
}

export function formatRating(rating: number): string {
  return `${rating.toFixed(1)} out of 5`;
}

/**
 * A link that opens turn-by-turn directions in Google Maps, which needs no
 * API key. Coordinates are used rather than the address because several
 * addresses in the data are incomplete (e.g. just a street name).
 */
export function directionsUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${lat},${lng}`,
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
