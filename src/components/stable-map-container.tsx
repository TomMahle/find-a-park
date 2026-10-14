"use client";

import {
  createLeafletContext,
  LeafletContext,
  type LeafletContextInterface,
} from "@react-leaflet/core";
import L from "leaflet";
import { useEffect, useRef, useState, type ReactNode } from "react";

type StableMapContainerProps = {
  /** Read once, when the map is created. */
  options: L.MapOptions;
  /** The initial view. Read once, when the map is created. */
  bounds: L.LatLngBoundsExpression;
  boundsOptions?: L.FitBoundsOptions;
  className?: string;
  children: ReactNode;
};

/**
 * A drop-in replacement for react-leaflet's `MapContainer` that survives
 * Next.js navigation.
 *
 * With `cacheComponents` on, Next.js keeps a page you navigate away from
 * mounted inside a hidden React `<Activity>`: its effects are cleaned up, its
 * DOM is kept, and the effects run again when you come back. react-leaflet's
 * `MapContainer` destroys the Leaflet map in that cleanup but only ever
 * creates it once, so on return every marker tries to attach to a destroyed
 * map and throws.
 *
 * This version creates the map once and only destroys it when its element
 * has left the document by the time the cleanup runs. While hidden, the DOM
 * stays, so the map survives, layers re-attach to it, and the user's pan and
 * zoom are kept.
 *
 * Limitation: if Next.js later discards the hidden page outright, the cleanup
 * has already run and won't run again, so `map.remove()` is never called.
 * Pass `trackResize: false` (as ParkMap does) so Leaflet holds no `window`
 * listener and the orphaned map can simply be garbage-collected.
 */
export function StableMapContainer({
  options,
  bounds,
  boundsOptions,
  className,
  children,
}: StableMapContainerProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [context, setContext] = useState<LeafletContextInterface | null>(null);
  const initial = useRef({ options, bounds, boundsOptions });

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    if (!mapRef.current) {
      const map = L.map(node, initial.current.options);
      map.fitBounds(initial.current.bounds, initial.current.boundsOptions);
      mapRef.current = map;
      // Children (tiles, markers) can only render once the map exists.
      setContext(createLeafletContext(map));
    }

    return () => {
      // React removes an unmounted component's DOM before running its effect
      // cleanups, so a still-connected node means the page was only hidden
      // (or this is React Strict Mode's simulated remount in development).
      if (!node.isConnected) {
        mapRef.current?.remove();
        mapRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={nodeRef} className={className}>
      {context && <LeafletContext value={context}>{children}</LeafletContext>}
    </div>
  );
}
