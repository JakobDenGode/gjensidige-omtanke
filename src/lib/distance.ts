export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
) {
  const radians = (value: number) => (value * Math.PI) / 180;
  const angle =
    Math.sin(radians(b.lat - a.lat) / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(radians(b.lon - a.lon) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, angle)));
}

export function formatDistance(distance: number) {
  if (distance < 0.05) return "under 100 m";
  if (distance < 1)
    return `${Math.max(100, Math.round(distance * 10) * 100)} m`;
  return `${distance.toLocaleString("nb-NO", { maximumFractionDigits: 1 })} km`;
}
