import Link from "next/link";
import { cn } from "@/lib/cn";
import { amenityLabel, formatAcreage, formatRating } from "@/lib/parks/format";
import type { Park } from "@/lib/parks/types";

/** How many amenities a card shows before summarizing the rest. */
const CARD_AMENITY_LIMIT = 4;

type ParkListProps = {
  parks: Park[];
  selectedId: string | null;
  onShowOnMap: (parkId: string) => void;
};

export function ParkList({ parks, selectedId, onShowOnMap }: ParkListProps) {
  return (
    // role="list" because Safari drops list semantics from unstyled lists.
    <ul role="list" className="flex flex-col gap-3" aria-label="Parks">
      {parks.map((park) => (
        <li key={park.id}>
          <ParkCard
            park={park}
            selected={park.id === selectedId}
            onShowOnMap={onShowOnMap}
          />
        </li>
      ))}
    </ul>
  );
}

function ParkCard({
  park,
  selected,
  onShowOnMap,
}: {
  park: Park;
  selected: boolean;
  onShowOnMap: (parkId: string) => void;
}) {
  const headingId = `park-card-${park.id}`;
  const shownAmenities = park.amenities.slice(0, CARD_AMENITY_LIMIT);
  const hiddenAmenityCount = park.amenities.length - shownAmenities.length;

  return (
    <article
      aria-labelledby={headingId}
      data-park-card={park.id}
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-surface p-4 transition-colors",
        selected
          ? "border-accent bg-accent-soft ring-1 ring-accent"
          : "border-border",
      )}
    >
      <h2 id={headingId} className="text-lg leading-snug font-semibold">
        <Link
          href={`/parks/${park.id}`}
          className="rounded-sm text-accent underline-offset-2 hover:text-accent-hover hover:underline"
        >
          {park.name}
        </Link>
      </h2>

      <p className={cn("text-sm", park.address ? "" : "text-muted italic")}>
        {park.address ?? "Address not listed"}
      </p>

      {(park.rating !== null || park.hours || park.acreage !== null) && (
        <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          {park.rating !== null && (
            <div className="flex items-center gap-1">
              <dt className="sr-only">Rating</dt>
              <dd className="flex items-center gap-1">
                <StarIcon />
                <span aria-hidden="true">{park.rating.toFixed(1)}</span>
                <span className="sr-only">{formatRating(park.rating)}</span>
              </dd>
            </div>
          )}
          {park.hours && (
            <div>
              <dt className="sr-only">Hours</dt>
              <dd>{park.hours}</dd>
            </div>
          )}
          {park.acreage !== null && (
            <div>
              <dt className="sr-only">Size</dt>
              <dd>{formatAcreage(park.acreage)}</dd>
            </div>
          )}
        </dl>
      )}

      {shownAmenities.length > 0 && (
        <ul
          role="list"
          className="flex flex-wrap gap-1.5"
          aria-label="Amenities"
        >
          {shownAmenities.map((amenity) => (
            <li
              key={amenity}
              className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[0.8125rem] font-medium"
            >
              {amenityLabel(amenity)}
            </li>
          ))}
          {hiddenAmenityCount > 0 && (
            <li className="px-1 py-0.5 text-[0.8125rem] text-muted">
              +{hiddenAmenityCount} more
            </li>
          )}
        </ul>
      )}

      <div className="mt-1">
        {park.coordinates ? (
          <button
            type="button"
            onClick={() => onShowOnMap(park.id)}
            // Starts with the visible text so voice control ("click Show on
            // map") still works; the park name tells screen reader users
            // which of the many identical buttons this is.
            aria-label={`Show on map: ${park.name}`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface-muted"
          >
            <PinIcon />
            Show on map
          </button>
        ) : (
          <p className="text-sm text-muted italic">
            Location not available, so this park isn’t on the map.
          </p>
        )}
      </div>
    </article>
  );
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4 text-amber-600 dark:text-amber-400"
      fill="currentColor"
    >
      <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
    </svg>
  );
}

function PinIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="currentColor"
    >
      <path d="M10 1.5a6 6 0 0 0-6 6c0 4.4 5.2 10.2 5.4 10.5a.8.8 0 0 0 1.2 0c.2-.3 5.4-6.1 5.4-10.5a6 6 0 0 0-6-6Zm0 8.3a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z" />
    </svg>
  );
}
