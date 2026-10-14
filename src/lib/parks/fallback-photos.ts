import type { Park } from "./types";

export type FallbackPhoto = {
  src: string;
  /** Describes what's in this specific photo. */
  alt: string;
  credit: {
    author: string;
    license: string;
    licenseUrl: string;
    /** The photo's page on Wikimedia Commons. */
    sourceUrl: string;
  };
};

/**
 * Openly licensed photos of real parks, shown only when a park's own listed
 * photos are missing or all fail to load. The park data itself is never
 * changed; this is a local backup, like a CDN fallback.
 *
 * Only add parks you've verified are the real place in the photos: the
 * listing's name must match `parkName` exactly, so a reused id can't show
 * the wrong park. Most parks in the sample data are fictional (no matching
 * real park), so they intentionally have no entry.
 *
 * Photos are linked from Wikimedia Commons, which permits hotlinking. Each
 * one's license requires the credit shown under it.
 */
const FALLBACK_PHOTOS = new Map<
  string,
  { parkName: string; photos: readonly FallbackPhoto[] }
>([
  [
    "prospect-park",
    {
      parkName: "Prospect Park",
      photos: [
        {
          src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/df/Prospect_park_boathouse%2C_May_2019.jpg/960px-Prospect_park_boathouse%2C_May_2019.jpg",
          alt: "The Prospect Park Boathouse, a white two-story building with arched windows, reflected in the lake on a sunny spring day",
          credit: {
            author: "Antigng",
            license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
            sourceUrl:
              "https://commons.wikimedia.org/wiki/File:Prospect_park_boathouse,_May_2019.jpg",
          },
        },
        {
          src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b5/Fall_reflections_in_Prospect_Park_Lake.jpg/960px-Fall_reflections_in_Prospect_Park_Lake.jpg",
          alt: "Autumn trees in orange and green reflected in Prospect Park Lake under a cloudy sky",
          credit: {
            author: "Thomas Gosnell",
            license: "CC BY-SA 4.0",
            licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
            sourceUrl:
              "https://commons.wikimedia.org/wiki/File:Fall_reflections_in_Prospect_Park_Lake.jpg",
          },
        },
      ],
    },
  ],
]);

/** Backup photos for a park, or none if it has no verified entry. */
export function fallbackPhotosFor(
  park: Pick<Park, "id" | "name">,
): readonly FallbackPhoto[] {
  const entry = FALLBACK_PHOTOS.get(park.id);
  return entry && entry.parkName === park.name ? entry.photos : [];
}
