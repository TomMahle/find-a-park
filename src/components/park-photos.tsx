"use client";

import Image from "next/image";
import { useState } from "react";
import type { FallbackPhoto } from "@/lib/parks/fallback-photos";

/**
 * Shows a park's photos.
 *
 * The listing's own photos always win. Only if the listing has none, or
 * every one of them fails to load, are `fallback` photos (openly licensed
 * photos of the same park, with credits) shown instead. A photo that fails
 * to load becomes a labeled "Photo unavailable" tile, not a broken image.
 *
 * Images are not optimized: the hosts are unknown ahead of time, and the
 * optimizer would turn a broken upstream image into a server error.
 */
export function ParkPhotos({
  parkName,
  images,
  fallback,
}: {
  parkName: string;
  images: string[];
  fallback: readonly FallbackPhoto[];
}) {
  const [failed, setFailed] = useState<ReadonlySet<string>>(new Set());
  const markFailed = (src: string) => {
    // Visible to developers, so broken photo URLs in the data get noticed
    // even when a fallback covers for them.
    console.warn(`[photos] Couldn't load ${src} (${parkName})`);
    setFailed((previous) => new Set(previous).add(src));
  };

  const listedAllFailed =
    images.length > 0 && images.every((src) => failed.has(src));
  const showFallback =
    fallback.length > 0 && (images.length === 0 || listedAllFailed);

  if (showFallback) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted">
          {images.length === 0
            ? "This listing has no photos"
            : "This listing’s photos couldn’t be loaded"}
          , so these are openly licensed photos of {parkName} from Wikimedia
          Commons.
        </p>
        <ul role="list" className="grid grid-cols-2 gap-3">
          {fallback.map((photo) => (
            <li key={photo.src}>
              <figure className="flex flex-col gap-1.5">
                <PhotoTile
                  src={photo.src}
                  alt={photo.alt}
                  failed={failed.has(photo.src)}
                  onError={() => markFailed(photo.src)}
                />
                <figcaption className="text-xs text-muted">
                  Photo:{" "}
                  <a
                    href={photo.credit.sourceUrl}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {photo.credit.author}
                  </a>
                  ,{" "}
                  <a
                    href={photo.credit.licenseUrl}
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {photo.credit.license}
                  </a>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <ul role="list" className="grid grid-cols-2 gap-3">
      {images.map((src, index) => (
        <li key={src}>
          <PhotoTile
            src={src}
            alt={`${parkName}, photo ${index + 1} of ${images.length}`}
            failed={failed.has(src)}
            onError={() => markFailed(src)}
          />
        </li>
      ))}
    </ul>
  );
}

function PhotoTile({
  src,
  alt,
  failed,
  onError,
}: {
  src: string;
  alt: string;
  failed: boolean;
  onError: () => void;
}) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface-muted">
      {failed ? (
        <div
          role="img"
          aria-label={`${alt} (unavailable)`}
          className="flex h-full flex-col items-center justify-center gap-2 text-muted"
        >
          <PhotoIcon />
          <span className="px-2 text-center text-sm">Photo unavailable</span>
        </div>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="(min-width: 1024px) 320px, 50vw"
          className="object-cover"
          onError={onError}
        />
      )}
    </div>
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
