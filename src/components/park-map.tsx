"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { amenityLabel } from "@/lib/parks/format";
import type { ParkWithCoordinates } from "@/lib/parks/types";
import { StableMapContainer } from "./stable-map-container";

/**
 * Tiles come from the OpenStreetMap Foundation's public servers by default,
 * which is fine for local development and demos but not allowed for
 * production traffic. Point these at a tile provider before public launch.
 */
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

/** Zoom used when jumping to a single park from the list. */
const PARK_ZOOM = 15;

export type ShowOnMapRequest = {
  parkId: string;
  /** Changes on every request so asking for the same park twice still works. */
  nonce: number;
};

type ParkMapProps = {
  /** Parks the map frames when it first opens (all of them, not search results). */
  initialView: ParkWithCoordinates[];
  /** Parks to show as markers. */
  parks: ParkWithCoordinates[];
  selectedId: string | null;
  showRequest: ShowOnMapRequest | null;
  onSelect: (parkId: string | null) => void;
};

export default function ParkMap({
  initialView,
  parks,
  selectedId,
  showRequest,
  onSelect,
}: ParkMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const anyTileLoaded = useRef(false);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="park-map relative h-full w-full">
      <StableMapContainer
        bounds={initialView.map(({ coordinates }) => [
          coordinates.lat,
          coordinates.lng,
        ])}
        boundsOptions={{ padding: [40, 40] }}
        options={{
          maxZoom: 18,
          zoomAnimation: !reducedMotion,
          fadeAnimation: !reducedMotion,
          markerZoomAnimation: !reducedMotion,
        }}
        className="h-full w-full"
      >
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTRIBUTION}
          eventHandlers={{
            tileload: () => {
              anyTileLoaded.current = true;
              setTilesFailed(false);
            },
            tileerror: () => {
              // Only warn when nothing has loaded at all, not for one bad tile.
              if (!anyTileLoaded.current) setTilesFailed(true);
            },
          }}
        />
        <InvalidateSizeOnResize />
        <PopupFocusManager />
        {parks.map((park) => (
          <ParkMarker
            key={park.id}
            park={park}
            selected={park.id === selectedId}
            onSelect={onSelect}
          />
        ))}
        {/* After the markers, so their effects (adding them to the map) run
            first when the map mounts with a request already pending. */}
        <ShowOnMap
          request={showRequest}
          parks={parks}
          reducedMotion={reducedMotion}
        />
      </StableMapContainer>
      {tilesFailed && (
        <p
          role="status"
          className="absolute inset-x-3 top-3 z-[1000] rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md"
        >
          The map background couldn’t load. Park markers still work, and every
          park is in the list.
        </p>
      )}
    </div>
  );
}

const PIN_SVG = `<svg viewBox="0 0 30 40" aria-hidden="true" focusable="false"><path fill="currentColor" stroke="#fff" stroke-width="2" d="M15 1.5C7.5 1.5 1.5 7.3 1.5 14.6c0 9.6 11.6 22 12.1 22.6a1.9 1.9 0 0 0 2.8 0c.5-.6 12.1-13 12.1-22.6C28.5 7.3 22.5 1.5 15 1.5Z"/><circle cx="15" cy="14.5" r="5" fill="#fff"/></svg>`;

function markerIcon(selected: boolean) {
  return L.divIcon({
    html: PIN_SVG,
    className: selected ? "park-marker park-marker--selected" : "park-marker",
    // A 44x44 target (WCAG 2.5.5) whose bottom center is the pin's tip.
    iconSize: [44, 44],
    iconAnchor: [22, 42],
    popupAnchor: [0, -40],
  });
}

function ParkMarker({
  park,
  selected,
  onSelect,
}: {
  park: ParkWithCoordinates;
  selected: boolean;
  onSelect: (parkId: string | null) => void;
}) {
  const icon = useMemo(() => markerIcon(selected), [selected]);
  const markerRef = useRef<L.Marker>(null);
  const label = park.address ? `${park.name}, ${park.address}` : park.name;

  // Marker (a child) adds itself to the map in its own effect, which runs
  // before this one, so the icon element exists here.
  useEffect(() => {
    if (markerRef.current) {
      enhanceMarkerElement(markerRef.current, park.id, label);
    }
  }, [park.id, label]);

  return (
    <Marker
      ref={markerRef}
      position={[park.coordinates.lat, park.coordinates.lng]}
      icon={icon}
      title={park.name}
      eventHandlers={{
        popupopen: () => onSelect(park.id),
        popupclose: () => onSelect(null),
      }}
    >
      <Popup>
        <ParkPopup park={park} />
      </Popup>
    </Marker>
  );
}

/**
 * Leaflet makes markers focusable with role="button", but only gives them a
 * `title` and only opens the popup on Enter. Give each marker a proper
 * accessible name and support Space too, as a native button would.
 *
 * Leaflet reuses the same element when a divIcon changes (e.g. on
 * selection), so this only needs to run once per element.
 */
function enhanceMarkerElement(marker: L.Marker, parkId: string, label: string) {
  const element = marker.getElement();
  if (!element || element.dataset.parkId === parkId) return;
  element.dataset.parkId = parkId;
  element.setAttribute("aria-label", `${label}. Show park summary.`);
  element.addEventListener("keydown", (event) => {
    if (event.key === " ") {
      event.preventDefault();
      marker.openPopup();
    }
  });
}

function ParkPopup({ park }: { park: ParkWithCoordinates }) {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const amenities = park.amenities.slice(0, 3).map(amenityLabel);
  const more = park.amenities.length - amenities.length;

  // react-leaflet first renders popup content just after the popup opens, so
  // on the first open this is the earliest moment the link exists. Moving
  // focus here puts keyboard and screen reader users straight into the
  // summary. Later opens are handled by PopupFocusManager.
  useEffect(() => {
    linkRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex min-w-48 flex-col gap-1.5">
      <p className="text-base font-semibold">{park.name}</p>
      <p className="text-muted">{park.address ?? "Address not listed"}</p>
      {amenities.length > 0 && (
        <p className="text-muted">
          {amenities.join(" · ")}
          {more > 0 && ` · +${more} more`}
        </p>
      )}
      <Link
        ref={linkRef}
        href={`/parks/${park.id}`}
        className="mt-1 font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
        data-popup-primary={park.id}
      >
        View park details
        <span className="sr-only">: {park.name}</span>
      </Link>
    </div>
  );
}

/** Pans to a park and opens its popup when the list asks for it. */
function ShowOnMap({
  request,
  parks,
  reducedMotion,
}: {
  request: ShowOnMapRequest | null;
  parks: ParkWithCoordinates[];
  reducedMotion: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!request) return;
    const park = parks.find((candidate) => candidate.id === request.parkId);
    if (!park) return;

    // The map may have just been revealed (mobile List/Map toggle) and still
    // think it is 0x0, which would break centering.
    map.invalidateSize();
    const target = L.latLng(park.coordinates.lat, park.coordinates.lng);
    map.setView(target, Math.max(map.getZoom(), PARK_ZOOM), {
      animate: !reducedMotion,
    });

    map.eachLayer((layer) => {
      if (
        layer instanceof L.Marker &&
        layer.getElement()?.dataset.parkId === park.id
      ) {
        layer.openPopup();
      }
    });
    // Only react to new requests, not to the parks list being re-created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, map]);

  return null;
}

/**
 * Leaflet popups don't manage focus. This moves focus into a popup when it
 * opens (with ParkPopup's help on the first open), puts it back on whatever
 * opened it (a marker or a "Show on map" button) when it closes, and makes
 * Escape close the popup, so keyboard users never lose their place.
 */
function PopupFocusManager() {
  const map = useMap();

  useEffect(() => {
    let opener: HTMLElement | null = null;

    const onOpen = (event: L.PopupEvent) => {
      const active = document.activeElement;
      // On phones the "Show on map" button is hidden as the map appears, so
      // focus has already fallen back to <body>; treat that as no opener.
      opener =
        active instanceof HTMLElement && active !== document.body
          ? active
          : null;
      // react-leaflet keeps popup content mounted after the first open, so on
      // later opens the link already exists and can take focus now. (On the
      // first open it doesn't exist yet; ParkPopup focuses it on mount.)
      event.popup
        .getElement()
        ?.querySelector<HTMLElement>("[data-popup-primary]")
        ?.focus({ preventScroll: true });
    };

    const onClose = (event: L.PopupEvent) => {
      const container = event.popup.getElement();
      const active = document.activeElement;
      const focusWasInPopup =
        active === null ||
        active === document.body ||
        (container?.contains(active) ?? false);
      const returnTo = opener;
      opener = null;
      if (!focusWasInPopup) return;

      // Prefer the element that opened the popup. If it is gone or hidden
      // (the mobile list is hidden while the map shows), use the marker.
      if (returnTo?.isConnected && isVisible(returnTo)) {
        returnTo.focus({ preventScroll: true });
        return;
      }
      const parkId = container
        ?.querySelector<HTMLElement>("[data-popup-primary]")
        ?.getAttribute("data-popup-primary");
      if (parkId) {
        map
          .getContainer()
          .querySelector<HTMLElement>(
            `.park-marker[data-park-id="${CSS.escape(parkId)}"]`,
          )
          ?.focus({ preventScroll: true });
      }
    };

    // Leaflet only handles Escape while the map container itself has focus,
    // not while focus is inside a popup or on a marker.
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") map.closePopup();
    };
    const container = map.getContainer();

    map.on("popupopen", onOpen);
    map.on("popupclose", onClose);
    container.addEventListener("keydown", onKeyDown);
    return () => {
      map.off("popupopen", onOpen);
      map.off("popupclose", onClose);
      container.removeEventListener("keydown", onKeyDown);
    };
  }, [map]);

  return null;
}

function isVisible(element: HTMLElement) {
  return element.getClientRects().length > 0;
}

/**
 * Leaflet measures its container once. When the map is hidden and shown again
 * (mobile List/Map toggle) or the layout changes size, tell it to re-measure.
 */
function InvalidateSizeOnResize() {
  const map = useMap();

  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function usePrefersReducedMotion() {
  const [reduced] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  return reduced;
}
