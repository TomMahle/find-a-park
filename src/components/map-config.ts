/** Map tile settings. No Leaflet import: safe to use from server-rendered code. */

/**
 * Tiles come from the OpenStreetMap Foundation's public servers by default,
 * which is fine for local development and demos but not allowed for
 * production traffic. Point these at a tile provider before public launch.
 * (NEXT_PUBLIC_ values are read at build time.)
 */
const CUSTOM_TILE_URL = process.env.NEXT_PUBLIC_MAP_TILE_URL || undefined;
export const TILE_URL =
  CUSTOM_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
/** HTML from build-time configuration (never from park data). */
export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ||
  (CUSTOM_TILE_URL
    ? ""
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors');
