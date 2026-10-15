import { orderAmenities } from "./amenities";
import type { Coordinates, Park } from "./types";

/**
 * Turns untrusted park records (e.g. the contents of `parks.sample.json`)
 * into `Park` objects the UI can rely on.
 *
 * Policy: never invent data. A field that is missing, empty or malformed
 * becomes `null` (or `[]`), and the UI says it isn't listed. A record is only
 * dropped when it can't be shown at all — no usable id or name, or an id that
 * duplicates an earlier record. Every dropped record or discarded value is
 * reported in `warnings` so data problems are visible to maintainers.
 */
export function normalizeParks(input: unknown): {
  parks: Park[];
  warnings: string[];
} {
  const warnings: string[] = [];

  if (!Array.isArray(input)) {
    return { parks: [], warnings: ["Park data is not an array."] };
  }

  const seenIds = new Set<string>();
  const parks: Park[] = [];

  input.forEach((record: unknown, index) => {
    const label = `Park #${index}`;

    if (!isObject(record)) {
      warnings.push(`${label}: skipped because it is not an object.`);
      return;
    }

    const id = text(record.id);
    if (id === null || !ID_PATTERN.test(id)) {
      warnings.push(`${label}: skipped because it has no valid id.`);
      return;
    }
    if (seenIds.has(id)) {
      warnings.push(`${label}: skipped because id "${id}" is a duplicate.`);
      return;
    }

    const name = text(record.name);
    if (name === null) {
      warnings.push(`${label} ("${id}"): skipped because it has no name.`);
      return;
    }

    seenIds.add(id);
    const warn = (message: string) => warnings.push(`"${id}": ${message}`);
    const location = isObject(record.location) ? record.location : {};

    parks.push({
      id,
      name,
      description: optionalText(record.description, "description", warn),
      coordinates: coordinates(location.lat, location.lng, warn),
      address: optionalText(location.address, "address", warn),
      amenities: orderAmenities(amenitySlugs(record.amenities, warn)),
      hours: optionalText(record.hours, "hours", warn),
      images: imageUrls(record.images, warn),
      acreage: numberInRange(record.acreage, "acreage", warn, {
        min: 0,
        exclusiveMin: true,
      }),
      rating: numberInRange(record.rating, "rating", warn, { min: 0, max: 5 }),
    });
  });

  parks.sort((a, b) => a.name.localeCompare(b.name, "en"));
  return { parks, warnings };
}

/** Ids become URL path segments, so keep them to a URL-safe slug. */
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

type Warn = (message: string) => void;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A non-empty, trimmed string, or `null`. */
function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Like `text`, but warns when a value is present and isn't text at all. */
function optionalText(
  value: unknown,
  field: string,
  warn: Warn,
): string | null {
  if (value !== null && value !== undefined && typeof value !== "string") {
    warn(`ignored ${field} because it is not text.`);
  }
  return text(value);
}

function numberInRange(
  value: unknown,
  field: string,
  warn: Warn,
  range: { min?: number; max?: number; exclusiveMin?: boolean },
): number | null {
  if (value === null || value === undefined) return null;
  const valid =
    typeof value === "number" &&
    Number.isFinite(value) &&
    (range.min === undefined ||
      (range.exclusiveMin ? value > range.min : value >= range.min)) &&
    (range.max === undefined || value <= range.max);
  if (!valid) {
    warn(`ignored invalid ${field} ${JSON.stringify(value)}.`);
    return null;
  }
  return value;
}

function coordinates(
  lat: unknown,
  lng: unknown,
  warn: Warn,
): Coordinates | null {
  if (lat == null && lng == null) return null;
  const valid =
    typeof lat === "number" &&
    typeof lng === "number" &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    // (0, 0) is a common "unknown" placeholder, never a real park here.
    !(lat === 0 && lng === 0);
  if (!valid) {
    warn(
      `ignored invalid coordinates ${JSON.stringify({ lat, lng })}; the park will not appear on the map.`,
    );
    return null;
  }
  return { lat, lng };
}

function stringList(value: unknown, field: string, warn: Warn): string[] {
  if (value === null || value === undefined) return [];
  if (!Array.isArray(value)) {
    warn(`ignored ${field} because it is not a list.`);
    return [];
  }
  const items = value.map(text).filter((item) => item !== null);
  if (items.length !== value.length) {
    warn(`ignored ${value.length - items.length} empty or invalid ${field}.`);
  }
  return [...new Set(items)];
}

/** Amenity slugs need a letter or digit to make a readable label. */
function amenitySlugs(value: unknown, warn: Warn): string[] {
  return stringList(value, "amenities", warn).filter((slug) => {
    if (/[\p{Letter}\p{Number}]/u.test(slug)) return true;
    warn(`ignored amenity ${JSON.stringify(slug)} because it has no words.`);
    return false;
  });
}

function imageUrls(value: unknown, warn: Warn): string[] {
  return stringList(value, "images", warn).filter((url) => {
    let protocol: string;
    try {
      protocol = new URL(url).protocol;
    } catch {
      protocol = "";
    }
    if (protocol === "https:" || protocol === "http:") return true;
    warn(
      `ignored image ${JSON.stringify(url)} because it is not an http(s) URL.`,
    );
    return false;
  });
}
