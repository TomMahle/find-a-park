"use client";

import "leaflet/dist/leaflet.css";
import { Marker, TileLayer } from "react-leaflet";
import type { Coordinates } from "@/lib/parks/types";
import { TILE_URL } from "./map-config";
import { markerIcon } from "./map-marker";
import { StableMapContainer } from "./stable-map-container";

const PREVIEW_ZOOM = 15;
const icon = markerIcon(false);

/**
 * A still picture of the map around one park: no panning, zooming or
 * keyboard focus, so it can't trap scrolling on a phone. Attribution is
 * shown by the caption outside the map (see ParkLocationMap).
 */
export default function LocationMapCanvas({
  coordinates,
}: {
  coordinates: Coordinates;
}) {
  const point: [number, number] = [coordinates.lat, coordinates.lng];
  return (
    <StableMapContainer
      bounds={[point, point]}
      boundsOptions={{ maxZoom: PREVIEW_ZOOM }}
      options={{
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        zoomControl: false,
        attributionControl: false,
        trackResize: false,
      }}
      className="h-full w-full"
    >
      <TileLayer url={TILE_URL} />
      <Marker
        position={point}
        icon={icon}
        interactive={false}
        keyboard={false}
      />
    </StableMapContainer>
  );
}
