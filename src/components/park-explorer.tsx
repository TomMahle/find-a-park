"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { searchParks } from "@/lib/parks/search";
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
 * with a shared search and a shared selection: opening a marker highlights
 * its card, and "Show on map" on a card opens its marker.
 */
export function ParkExplorer({ parks }: { parks: Park[] }) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showRequest, setShowRequest] = useState<ShowOnMapRequest | null>(null);
  const [view, setView] = useState<View>("list");

  const allMappable = useMemo(() => parks.filter(hasCoordinates), [parks]);
  const results = useMemo(() => searchParks(parks, query), [parks, query]);
  const mappableParks = useMemo(
    () => results.filter(hasCoordinates),
    [results],
  );
  const unmappedCount = results.length - mappableParks.length;

  const showOnMap = useCallback((parkId: string) => {
    setView("map");
    setShowRequest((previous) => ({
      parkId,
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

  useScrollSelectedCardIntoView(selectedId);

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-x-6">
      <div className="flex flex-col gap-3 lg:col-start-1">
        <SearchField value={query} onChange={setQuery} />
        <p role="status" className="text-sm text-muted">
          {query.trim() === ""
            ? `Showing all ${parks.length} parks`
            : `Showing ${results.length} of ${parks.length} parks`}
        </p>
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
      </div>

      <section
        aria-label="Park list"
        className={cn(view === "map" && "hidden", "lg:col-start-1 lg:block")}
      >
        {results.length > 0 ? (
          <ParkList
            parks={results}
            selectedId={selectedId}
            onShowOnMap={showOnMap}
          />
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-6">
            <p>
              No parks match <q>{query.trim()}</q>. Try a park name, a street,
              or an amenity like “playground”.
            </p>
            <button
              type="button"
              onClick={() => setQuery("")}
              className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-semibold hover:bg-surface-muted"
            >
              Clear search
            </button>
          </div>
        )}
      </section>

      <section
        aria-labelledby="park-map-heading"
        className={cn(
          view === "list" && "hidden",
          "flex flex-col gap-2 lg:sticky lg:top-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:flex",
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
          {/* Gate on the full dataset, not search results, so the map isn't
              torn down (losing pan and zoom) when a search matches nothing. */}
          {allMappable.length > 0 ? (
            <MapErrorBoundary
              fallback={
                <MapMessage>
                  The map couldn’t be loaded. Every park is still in the list.
                </MapMessage>
              }
            >
              <RenderWhenVisible>
                <ParkMap
                  initialView={allMappable}
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

function SearchField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold">
        Search parks
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Name, street or amenity, e.g. playground"
        autoComplete="off"
        className="min-h-11 rounded-md border border-border bg-surface px-3 text-base placeholder:text-muted"
      />
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
