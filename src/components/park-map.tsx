"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { amenityLabel } from "@/lib/parks/amenities";
import type { ParkWithCoordinates } from "@/lib/parks/types";
import { TILE_ATTRIBUTION, TILE_URL } from "./map-config";
import { markerIcon } from "./map-marker";
import { StableMapContainer } from "./stable-map-container";

/** Zoom used when jumping to a single park from the list. */
const PARK_ZOOM = 15;
/** Popups stay narrow enough to fit a 320px-wide phone screen. */
const POPUP_MAX_WIDTH = 220;

export type ShowOnMapRequest = {
  parkId: string;
  /**
   * "open": zoom in if needed and open the park's popup ("Show on map").
   * "center": just pan to it at the current zoom and select it (clicking a
   * list card), without opening a popup or moving focus.
   */
  mode: "open" | "center";
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
  /** Id of the visually hidden keyboard instructions for the map. */
  instructionsId: string;
};

export default function ParkMap({
  initialView,
  parks,
  selectedId,
  showRequest,
  onSelect,
  instructionsId,
}: ParkMapProps) {
  const [tilesFailed, setTilesFailed] = useState(false);
  const anyTileLoaded = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  // Set while ShowOnMap closes a popup itself, so focus isn't pulled back to
  // whatever opened that popup.
  const closingQuietlyRef = useRef(false);

  return (
    <div className="park-map relative h-full w-full">
      <StableMapContainer
        bounds={initialView.map(({ coordinates }) => [
          coordinates.lat,
          coordinates.lng,
        ])}
        boundsOptions={{ padding: [40, 40], maxZoom: PARK_ZOOM }}
        options={{
          maxZoom: 18,
          zoomAnimation: !reducedMotion,
          fadeAnimation: !reducedMotion,
          markerZoomAnimation: !reducedMotion,
          // InvalidateSizeOnResize already handles resizing. Leaflet's own
          // window listener would also keep a discarded map alive forever.
          trackResize: false,
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
        <MapKeyboardSupport instructionsId={instructionsId} />
        <PopupFocusManager closingQuietlyRef={closingQuietlyRef} />
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
          onSelect={onSelect}
          closingQuietlyRef={closingQuietlyRef}
        />
      </StableMapContainer>
      {tilesFailed && (
        <p
          role="status"
          // Bottom left, clear of the zoom buttons (top left) and the
          // attribution (bottom right).
          className="absolute bottom-7 left-3 z-[1000] max-w-[calc(100%-1.5rem)] rounded-md border border-border bg-surface px-3 py-2 text-sm shadow-md"
        >
          The map background couldn’t load. Park markers still work, and every
          park is in the list.
        </p>
      )}
    </div>
  );
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
      eventHandlers={{
        popupopen: () => onSelect(park.id),
        popupclose: () => onSelect(null),
      }}
    >
      <Popup maxWidth={POPUP_MAX_WIDTH}>
        <ParkPopup park={park} />
      </Popup>
    </Marker>
  );
}

/**
 * Leaflet makes markers focusable with role="button", but gives them no
 * accessible name and only opens the popup on Enter. Name each marker and
 * support Space too, as a native button would.
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
  const ids = {
    heading: `popup-${park.id}-heading`,
    address: `popup-${park.id}-address`,
    amenities: `popup-${park.id}-amenities`,
  };

  // react-leaflet first renders popup content just after the popup opens, so
  // on the first open this is the earliest moment the link exists. Moving
  // focus here puts keyboard and screen reader users straight into the
  // summary. Later opens are handled by PopupFocusManager.
  useEffect(() => {
    linkRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div
      role="group"
      aria-labelledby={ids.heading}
      className="flex min-w-44 flex-col gap-1.5"
    >
      <h3 id={ids.heading} className="text-base font-semibold">
        {park.name}
      </h3>
      <p id={ids.address} className="text-muted">
        {park.address ?? "Address not listed"}
      </p>
      {amenities.length > 0 && (
        <p id={ids.amenities} className="text-muted">
          {amenities.join(" · ")}
          {more > 0 && ` · +${more} more`}
        </p>
      )}
      <Link
        ref={linkRef}
        href={`/parks/${park.id}`}
        aria-label={`View park details: ${park.name}`}
        // Focus lands on this link, so let it carry the summary too: screen
        // readers announce the address and amenities as its description.
        aria-describedby={
          amenities.length > 0 ? `${ids.address} ${ids.amenities}` : ids.address
        }
        className="mt-1 font-semibold text-accent underline underline-offset-2 hover:text-accent-hover"
        data-popup-primary={park.id}
      >
        View park details
      </Link>
    </div>
  );
}

/** Pans to a park (and maybe opens its popup) when the list asks for it. */
function ShowOnMap({
  request,
  parks,
  reducedMotion,
  onSelect,
  closingQuietlyRef,
}: {
  request: ShowOnMapRequest | null;
  parks: ParkWithCoordinates[];
  reducedMotion: boolean;
  onSelect: (parkId: string | null) => void;
  closingQuietlyRef: React.RefObject<boolean>;
}) {
  const map = useMap();
  const handledNonce = useRef<number | null>(null);

  useEffect(() => {
    // React re-runs effects when Next.js shows a hidden page again (and in
    // Strict Mode), so remember which request was handled; otherwise coming
    // Back would jump the map to the last "Show on map" park.
    if (!request || request.nonce === handledNonce.current) return;
    handledNonce.current = request.nonce;

    const park = parks.find((candidate) => candidate.id === request.parkId);
    const marker = findMarker(map, request.parkId);
    if (!park || !marker) return;

    // The map may have just been revealed (mobile List/Map toggle) and still
    // think it is 0x0, which would break centering.
    map.invalidateSize();

    if (request.mode === "center") {
      // Another park's popup would contradict the new selection, so close it
      // (its popupclose clears the selection; set it again after).
      closingQuietlyRef.current = true;
      map.closePopup();
      closingQuietlyRef.current = false;
      onSelect(park.id);
      map.panTo([park.coordinates.lat, park.coordinates.lng], {
        animate: !reducedMotion,
      });
      return;
    }

    // Open the popup only once the map has arrived. Opening it during the
    // animation stops the pan partway (popup auto-pan and moving focus into
    // the popup both interrupt it), leaving the park off-center. Leaflet
    // fires moveend even when no move is needed, so the popup always opens.
    map.once("moveend", () => marker.openPopup());
    map.setView(
      [park.coordinates.lat, park.coordinates.lng],
      Math.max(map.getZoom(), PARK_ZOOM),
      { animate: !reducedMotion },
    );
    // Only react to new requests, not to the parks list being re-created.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request, map]);

  return null;
}

function findMarker(map: L.Map, parkId: string): L.Marker | null {
  let found: L.Marker | null = null;
  map.eachLayer((layer) => {
    if (
      layer instanceof L.Marker &&
      layer.getElement()?.dataset.parkId === parkId
    ) {
      found = layer;
    }
  });
  return found;
}

/**
 * Keyboard and screen reader support for the map as a whole, which Leaflet
 * leaves out:
 * - The map container is a Tab stop (for arrow-key panning and +/- zoom) but
 *   has no role or name; give it both, plus the instructions.
 * - Escape only closes a popup while the map container itself has focus,
 *   not while focus is inside the popup or on a marker.
 * - Leaflet's zoom and popup close controls are links with role="button"
 *   that ignore Space, unlike real buttons.
 */
function MapKeyboardSupport({ instructionsId }: { instructionsId: string }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.setAttribute("role", "group");
    container.setAttribute("aria-label", "Map of parks");
    container.setAttribute("aria-describedby", instructionsId);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        map.closePopup();
      } else if (
        event.key === " " &&
        event.target instanceof HTMLAnchorElement &&
        event.target.getAttribute("role") === "button"
      ) {
        event.preventDefault();
        event.target.click();
      }
    };
    container.addEventListener("keydown", onKeyDown);
    return () => container.removeEventListener("keydown", onKeyDown);
  }, [map, instructionsId]);

  return null;
}

/**
 * Leaflet popups don't manage focus. This moves focus into a popup when it
 * opens (with ParkPopup's help on the first open) and puts it back on
 * whatever opened it (a marker or a "Show on map" button) when it closes, so
 * keyboard users never lose their place.
 */
function PopupFocusManager({
  closingQuietlyRef,
}: {
  closingQuietlyRef: React.RefObject<boolean>;
}) {
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
      if (!focusWasInPopup || closingQuietlyRef.current) return;

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
        findMarker(map, parkId)?.getElement()?.focus({ preventScroll: true });
      }
    };

    map.on("popupopen", onOpen);
    map.on("popupclose", onClose);
    return () => {
      map.off("popupopen", onOpen);
      map.off("popupclose", onClose);
    };
  }, [map, closingQuietlyRef]);

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
