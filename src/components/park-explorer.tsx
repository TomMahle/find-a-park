"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { hasCoordinates, type Park } from "@/lib/parks/types";
import { MapErrorBoundary } from "./map-error-boundary";
import { ParkList } from "./park-list";
import type { ShowOnMapRequest } from "./park-map";
import { RenderWhenVisible } from "./render-when-visible";

// Leaflet touches `window` on import, so the map only ever renders in the browser.
const ParkMap = dynamic(() => import("./park-map"), {
  ssr: false,
  loading: () => (
    <MapMessage>
      <span role="status">Loading map…</span>
    </MapMessage>
  ),
});

type View = "list" | "map";

/**
 * The list and the map side by side (or one at a time on small screens),
 * with a shared selection: opening a marker highlights its card, and
 * "Show on map" on a card opens its marker.
 */
export function ParkExplorer({ parks }: { parks: Park[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState<ShowOnMapRequest | null>(null);
  const [view, setView] = useState<View>("list");

  const mappableParks = useMemo(() => parks.filter(hasCoordinates), [parks]);
  const unmappedCount = parks.length - mappableParks.length;

  const showOnMap = useCallback((parkId: string) => {
    setView("map");
    setShowRequest((previous) => ({
      parkId,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

  useScrollSelectedCardIntoView(selectedId);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <div
        role="group"
        aria-label="Show parks as"
        className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-surface p-1 lg:hidden"
      >
        <ViewButton current={view} value="list" onSelect={setView}>
          List
        </ViewButton>
        <ViewButton current={view} value="map" onSelect={setView}>
          Map
        </ViewButton>
      </div>

      <section
        aria-label="Park list"
        className={cn(view === "map" && "hidden", "lg:block")}
      >
        <ParkList
          parks={parks}
          selectedId={selectedId}
          onShowOnMap={showOnMap}
        />
      </section>

      <section
        aria-labelledby="park-map-heading"
        className={cn(
          view === "list" && "hidden",
          "flex flex-col gap-2 lg:sticky lg:top-4 lg:flex",
        )}
      >
        <h2 id="park-map-heading" className="sr-only">
          Map of parks
        </h2>
        <p className="sr-only">
          Each park is a button on the map. Use Tab to move between them and
          Enter to open a summary. The park list has the same information.
        </p>
        <div className="h-[70dvh] min-h-80 overflow-hidden rounded-lg border border-border bg-surface-muted lg:h-[calc(100dvh-2rem)]">
          {mappableParks.length > 0 ? (
            <MapErrorBoundary
              fallback={
                <MapMessage>
                  The map couldn’t be loaded. Every park is still in the list.
                </MapMessage>
              }
            >
              <RenderWhenVisible>
                <ParkMap
                  parks={mappableParks}
                  selectedId={selectedId}
                  showRequest={showRequest}
                  onSelect={setSelectedId}
                />
              </RenderWhenVisible>
            </MapErrorBoundary>
          ) : (
            <MapMessage>
              No parks have a location to show on the map.
            </MapMessage>
          )}
        </div>
        {unmappedCount > 0 && (
          <p className="text-sm text-muted">
            {unmappedCount === 1
              ? "1 park has no location and appears only in the list."
              : `${unmappedCount} parks have no location and appear only in the list.`}
          </p>
        )}
      </section>
    </div>
  );
}

function ViewButton({
  current,
  value,
  onSelect,
  children,
}: {
  current: View;
  value: View;
  onSelect: (view: View) => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => onSelect(value)}
      className={cn(
        "min-h-11 rounded-md text-sm font-semibold",
        active ? "bg-accent text-on-accent" : "hover:bg-surface-muted",
      )}
    >
      {children}
    </button>
  );
}

function MapMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-muted">
      <p>{children}</p>
    </div>
  );
}

/** Keeps the highlighted card visible when a park is picked on the map. */
function useScrollSelectedCardIntoView(selectedId: string | null) {
  useEffect(() => {
    if (!selectedId) return;
    const card = document.querySelector<HTMLElement>(
      `[data-park-card="${CSS.escape(selectedId)}"]`,
    );
    // Skip when the list is hidden (mobile map view).
    if (!card || card.getClientRects().length === 0) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    card.scrollIntoView({
      block: "nearest",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [selectedId]);
}
