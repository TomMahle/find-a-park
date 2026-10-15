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

/** Matches Tailwind's `lg` breakpoint, where list and map sit side by side. */
const SIDE_BY_SIDE_QUERY = "(min-width: 64rem)";

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
  const mapInstructionsId = useId();

  const updateQuery = (next: string) => {
    setQuery(next);
    // A park the search hides can't stay selected: its card and marker are
    // gone, and Leaflet doesn't report its popup closing in that case.
    if (
      selectedId !== null &&
      !searchParks(parks, next).some((park) => park.id === selectedId)
    ) {
      setSelectedId(null);
    }
  };

  const showOnMap = useCallback((parkId: string) => {
    setView("map");
    setShowRequest((previous) => ({
      parkId,
      mode: "open",
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

  // Clicking a card centers its park on the map, but only where the map is
  // next to the list; on phones a tap on a card shouldn't switch views.
  const centerOnMap = useCallback((parkId: string) => {
    if (!window.matchMedia(SIDE_BY_SIDE_QUERY).matches) return;
    setShowRequest((previous) => ({
      parkId,
      mode: "center",
      nonce: (previous?.nonce ?? 0) + 1,
    }));
  }, []);

  useScrollSelectedCardIntoView(selectedId);

  if (parks.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6">
        No parks are listed yet. Please check back later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start lg:gap-x-6">
      <div className="flex flex-col gap-3 lg:col-start-1">
        <SearchField value={query} onChange={updateQuery} />
        <ResultCount
          shown={results.length}
          total={parks.length}
          searching={query.trim() !== ""}
        />
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
            onCenterOnMap={centerOnMap}
          />
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-6">
            <p>
              No parks match <q>{query.trim()}</q>. Try a park name, a street,
              or an amenity like “playground”.
            </p>
            <button
              type="button"
              onClick={() => updateQuery("")}
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
        <p id={mapInstructionsId} className="sr-only">
          Each park is a button on the map: Tab moves between them, Enter or
          Space opens a summary, and Escape closes it. When the map itself has
          focus, arrow keys move it and plus and minus zoom. The park list has
          the same information.
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
                  instructionsId={mapInstructionsId}
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

function ResultCount({
  shown,
  total,
  searching,
}: {
  shown: number;
  total: number;
  searching: boolean;
}) {
  const parksWord = total === 1 ? "park" : "parks";
  const text = searching
    ? `Showing ${shown} of ${total} ${parksWord}`
    : total === 1
      ? "Showing 1 park"
      : `Showing all ${total} parks`;
  // Announce the count once typing pauses, not on every keystroke.
  const announcement = useDebouncedValue(text, 500);

  return (
    <>
      <p className="text-sm text-muted">{text}</p>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
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
        className="min-h-11 rounded-md border border-muted bg-surface px-3 text-base placeholder:text-muted"
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
