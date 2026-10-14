export function formatAcreage(acres: number): string {
  const value = acres.toLocaleString("en-US", { maximumFractionDigits: 1 });
  // Pluralize what's shown: 1.04 displays as "1", so "1 acre".
  return `${value} ${value === "1" ? "acre" : "acres"}`;
}

export function formatRating(rating: number): string {
  return `${rating.toFixed(1)} out of 5`;
}

/**
 * A link that opens turn-by-turn directions in Google Maps, which needs no
 * API key. Coordinates are used rather than the address because several
 * addresses in the data are incomplete (e.g. just a street name).
 */
export function directionsUrl(lat: number, lng: number): string {
  const params = new URLSearchParams({
    api: "1",
    destination: `${lat},${lng}`,
  });
  return `https://www.google.com/maps/dir/?${params}`;
}
