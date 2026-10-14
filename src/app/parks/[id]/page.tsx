import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ParkPhotos } from "@/components/park-photos";
import { getPark, getParks } from "@/lib/parks/data";
import {
  amenityLabel,
  directionsUrl,
  formatAcreage,
  formatRating,
} from "@/lib/parks/format";

export function generateStaticParams() {
  return getParks().map((park) => ({ id: park.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/parks/[id]">): Promise<Metadata> {
  const { id } = await params;
  const park = getPark(id);
  if (!park) return { title: "Park not found" };
  return {
    title: park.name,
    description:
      park.description ?? `Hours, amenities and directions for ${park.name}.`,
  };
}

export default async function ParkPage({ params }: PageProps<"/parks/[id]">) {
  const { id } = await params;
  const park = getPark(id);
  // Checked before anything renders so unknown ids get a real 404 status.
  if (!park) notFound();

  return (
    <article className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:px-6">
      <nav aria-label="Breadcrumb">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-1 rounded-md font-medium text-accent hover:text-accent-hover hover:underline"
        >
          <span aria-hidden="true">←</span> All parks
        </Link>
      </nav>

      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {park.name}
        </h1>
        {park.address && <p className="text-lg text-muted">{park.address}</p>}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col gap-8">
          <Section title="About">
            {park.description ? (
              <p className="max-w-prose leading-relaxed">{park.description}</p>
            ) : (
              <NotListed>No description available.</NotListed>
            )}
          </Section>

          <Section title="Amenities">
            {park.amenities.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {park.amenities.map((amenity) => (
                  <li
                    key={amenity}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-sm font-medium"
                  >
                    {amenityLabel(amenity)}
                  </li>
                ))}
              </ul>
            ) : (
              <NotListed>No amenities listed.</NotListed>
            )}
          </Section>

          <Section title="Photos">
            {park.images.length > 0 ? (
              <ParkPhotos parkName={park.name} images={park.images} />
            ) : (
              <NotListed>No photos available.</NotListed>
            )}
          </Section>
        </div>

        <aside
          aria-labelledby="visit-heading"
          className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 lg:sticky lg:top-4"
        >
          <h2 id="visit-heading" className="text-lg font-semibold">
            Plan your visit
          </h2>
          <dl className="flex flex-col gap-3">
            <Fact label="Hours" value={park.hours} />
            <Fact label="Address" value={park.address} />
            <Fact
              label="Size"
              value={park.acreage !== null ? formatAcreage(park.acreage) : null}
            />
            <Fact
              label="Rating"
              value={park.rating !== null ? formatRating(park.rating) : null}
            />
          </dl>
          {park.coordinates ? (
            <a
              href={directionsUrl(park.coordinates.lat, park.coordinates.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-4 font-semibold text-on-accent hover:bg-accent-hover"
            >
              Get directions
              <ExternalIcon />
              <span className="sr-only">(opens Google Maps in a new tab)</span>
            </a>
          ) : (
            <NotListed>
              Directions aren’t available because this park’s location isn’t
              listed.
            </NotListed>
          )}
        </aside>
      </div>
    </article>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-sm font-medium text-muted">{label}</dt>
      <dd>{value ?? <span className="text-muted italic">Not listed</span>}</dd>
    </div>
  );
}

function NotListed({ children }: { children: React.ReactNode }) {
  return <p className="text-muted italic">{children}</p>;
}

function ExternalIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M11 3h6v6M17 3l-8 8M8 5H4v11h11v-4" />
    </svg>
  );
}
