"use client";

import dynamic from "next/dynamic";
import type { Coordinates } from "@/lib/parks/types";
import { MapErrorBoundary } from "./map-error-boundary";
import { TILE_ATTRIBUTION } from "./map-config";

// Leaflet touches `window` on import, so the map only ever renders in the browser.
const LocationMapCanvas = dynamic(() => import("./location-map-canvas"), {
  ssr: false,
});

/**
 * A small map showing where a park is, for the details page.
 *
 * The map itself is hidden from screen readers: the address and the
 * directions link next to it carry the same information, and the caption
 * describes it.
 */
export function ParkLocationMap({
  parkName,
  coordinates,
}: {
  parkName: string;
  coordinates: Coordinates;
}) {
  return (
    <figure className="flex flex-col gap-1.5">
      <div
        aria-hidden="true"
        className="park-map park-map--static h-40 overflow-hidden rounded-md border border-border bg-surface-muted"
      >
        <MapErrorBoundary fallback={null}>
          <LocationMapCanvas coordinates={coordinates} />
        </MapErrorBoundary>
      </div>
      <figcaption className="text-xs text-muted">
        Map of {parkName}’s listed location.{" "}
        {/* Build-time configuration, never park data. */}
        <span
          className="[&_a]:underline [&_a]:underline-offset-2"
          dangerouslySetInnerHTML={{ __html: TILE_ATTRIBUTION }}
        />
      </figcaption>
    </figure>
  );
}
