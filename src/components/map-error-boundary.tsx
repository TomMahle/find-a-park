"use client";

import { Component, type ReactNode } from "react";

type Props = { fallback: ReactNode; children: ReactNode };

/**
 * If the map fails (its code chunk can't load, or Leaflet throws), show a
 * message in its place instead of taking down the list next to it.
 */
export class MapErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[map] failed to render", error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
