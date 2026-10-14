import { ParkExplorer } from "@/components/park-explorer";
import { getParks } from "@/lib/parks/data";

export default function Home() {
  const parks = getParks();

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Find a park
        </h1>
        <p className="text-muted">
          {parks.length} parks in New York City. Choose one from the list or the
          map to see its hours, amenities and directions.
        </p>
      </div>
      <ParkExplorer parks={parks} />
    </div>
  );
}
