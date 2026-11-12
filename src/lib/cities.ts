export const cities = [
  { name: "Oslo", lat: 59.91, lon: 10.75 },
  { name: "Bergen", lat: 60.39, lon: 5.32 },
  { name: "Trondheim", lat: 63.43, lon: 10.4 },
  { name: "Stavanger", lat: 58.97, lon: 5.73 },
  { name: "Tromsø", lat: 69.65, lon: 18.96 },
] as const;
export type City = (typeof cities)[number];
