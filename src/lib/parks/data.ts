import "server-only";

import rawParks from "../../../assets/parks.sample.json";
import { normalizeParks } from "./normalize";
import type { Park } from "./types";

/*
 * The dataset is a static file bundled at build time, so it is normalized
 * once per server process. Swapping in an API later only means changing
 * this module; pages depend on `getParks` / `getPark`, not on the file.
 */
const { parks, warnings } = normalizeParks(rawParks);

if (warnings.length > 0) {
  console.warn(
    `[parks] ${warnings.length} data issue(s):\n  ${warnings.join("\n  ")}`,
  );
}

export function getParks(): Park[] {
  return parks;
}

export function getPark(id: string): Park | undefined {
  return parks.find((park) => park.id === id);
}
