"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Renders `children` only once this wrapper has a real size, then keeps them.
 *
 * Leaflet can't lay out a map inside a `display: none` container, and on
 * phones the map starts hidden behind the List/Map toggle. Waiting also
 * means phone users who never open the map never download it.
 */
export function RenderWhenVisible({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || visible) return;
    const observer = new ResizeObserver(() => {
      if (element.clientWidth > 0 && element.clientHeight > 0) {
        setVisible(true);
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="h-full w-full">
      {visible && children}
    </div>
  );
}
