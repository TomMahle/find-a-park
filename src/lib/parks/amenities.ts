/**
 * Amenity display rules. The source data's amenity slugs are used as given;
 * this module only decides how they're labeled and in what order they show.
 */

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

/**
 * Amenities almost every park has, which residents rarely choose a park for
 * (and would usually check in a general maps app). They're listed after a
 * park's other amenities, so the first few chips on a card say what makes
 * that park worth visiting.
 */
export const LOW_PRIORITY_AMENITIES: readonly string[] = [
  "restrooms",
  "parking",
];

/** `"dog-run"` → `"Dog run"`; unknown slugs fall back to sentence case. */
export function amenityLabel(slug: string): string {
  // Slugs are normalized to contain at least one letter or digit, so this
  // never returns an empty label.
  const known = AMENITY_LABELS[slug];
  if (known) return known;
  const words = slug.replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Moves low-priority amenities to the end, in the order LOW_PRIORITY_AMENITIES
 * lists them. Everything else keeps its order from the data.
 */
export function orderAmenities(slugs: readonly string[]): string[] {
  const rank = (slug: string) => LOW_PRIORITY_AMENITIES.indexOf(slug);
  return [
    ...slugs.filter((slug) => rank(slug) === -1),
    ...slugs
      .filter((slug) => rank(slug) !== -1)
      .sort((a, b) => rank(a) - rank(b)),
  ];
}
