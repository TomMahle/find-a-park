/**
 * A park after normalization. Every optional field is either a usable value
 * or `null` (arrays are empty instead), so UI code never has to re-check
 * the raw data's shape.
 */
export type Park = {
  /** URL-safe identifier, unique across the dataset. */
  id: string;
  name: string;
  description: string | null;
  /** `null` when the source has no usable coordinates; such parks are listed but not mapped. */
  coordinates: Coordinates | null;
  address: string | null;
  /**
   * Amenity slugs as given in the source (e.g. `"dog-run"`), de-duplicated,
   * with common ones like restrooms and parking moved last (see amenities.ts).
   */
  amenities: string[];
  /** Free-text opening hours exactly as published (e.g. `"Dawn to dusk"`). */
  hours: string | null;
  /** Absolute http(s) image URLs. They may still fail to load at runtime. */
  images: string[];
  acreage: number | null;
  /** Rating on a 0–5 scale. The data doesn't say where ratings come from. */
  rating: number | null;
};

export type Coordinates = { lat: number; lng: number };

export type ParkWithCoordinates = Park & { coordinates: Coordinates };

export function hasCoordinates(park: Park): park is ParkWithCoordinates {
  return park.coordinates !== null;
}
