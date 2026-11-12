export const winterTasks = [
  "Måke inngang og gangvei",
  "Måke innkjørselen",
  "Flytte snø bort fra husveggen",
  "Fjerne snø rundt sluk og avløp",
  "Strø glatte partier",
];
export const timeChoices = [
  "Formiddag · kl. 09–12",
  "Ettermiddag · kl. 12–16",
  "Fleksibel",
];
export function osloDate(date = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Oslo" }).format(
    date,
  );
}
export function dateLabel(key: string) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("nb-NO", {
    timeZone: "Europe/Oslo",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
