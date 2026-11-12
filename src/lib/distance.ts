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
