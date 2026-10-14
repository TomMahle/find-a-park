"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Shows a park's photos. The data's image URLs may be placeholders that
 * never load, so each photo falls back to a labeled "Photo unavailable"
 * tile instead of a broken image icon.
 *
 * Images are not optimized: the hosts are unknown ahead of time, and the
 * optimizer would turn a broken upstream image into a server error.
 */
export function ParkPhotos({
  parkName,
  images,
}: {
  parkName: string;
  images: string[];
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {images.map((src, index) => {
        const alt = `${parkName}, photo ${index + 1} of ${images.length}`;
        return (
          <li
            key={src}
            className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted"
          >
            {failed.has(src) ? (
              <div
                role="img"
                aria-label={`${alt} (unavailable)`}
                className="flex h-full flex-col items-center justify-center gap-2 text-muted"
              >
                <PhotoIcon />
                <span className="text-sm">Photo unavailable</span>
              </div>
            ) : (
              <Image
                src={src}
                alt={alt}
                fill
                unoptimized
                sizes="(min-width: 640px) 50vw, 100vw"
                className="object-cover"
                onError={() =>
                  setFailed((previous) => new Set(previous).add(src))
                }
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function PhotoIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-8"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="m21 16-5-5-8 8" />
    </svg>
  );
}
