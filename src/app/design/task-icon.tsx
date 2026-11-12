import { taskAreas, contributionAreas } from "@/lib/task-areas";

const paths: Record<
  (typeof taskAreas)[number] | (typeof contributionAreas)[number],
  string
> = {
  "Besøk og selskap":
    "M4 28v-4a8 8 0 0 1 16 0v4M21 5a4 4 0 0 1 0 8m3 6a7 7 0 0 1 4 6v3M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "Hjelp til å handle":
    "M3 4h4l3 17h15l4-12H8M13 27a1 1 0 1 1-2 0 1 1 0 0 1 2 0M25 27a1 1 0 1 1-2 0 1 1 0 0 1 2 0",
  Hagearbeid:
    "M16 28V15M16 20C6 20 4 14 4 8c8 0 12 4 12 12ZM16 15C16 7 22 4 28 4c0 8-4 12-12 11ZM10 28h12",
  "Vanne planter": "M16 3C13 7 6 15 6 21a10 10 0 0 0 20 0c0-6-7-14-10-18Z",
  "Hente pakker":
    "M4 9 16 3l12 6v16l-12 6-12-6ZM4 9l12 6 12-6M16 15v16M10 6l12 6v7",
  Turfølge:
    "M14 5a2 2 0 1 1 4 0 2 2 0 0 1-4 0M16 10l-3 8 5 4 2 8M13 18l-5 12M16 10l5 7h6M16 10l-6 3-4 6",
  Snømåking:
    "M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4M5 14l5-2-1-5M23 25l-1-5 5-2M5 18l5 2-1 5M23 7l-1 5 5 2",
  "Praktiske småting":
    "M6 17v11H2V17h4Zm0 2 6-4 5 1c3 0 3 4 0 4h-5m-6 6h13l10-9c2-2 0-5-3-3l-6 5M14 9c-7-4-1-11 3-6 4-5 10 2 3 6l-3 3Z",
  "Mobil og data": "M9 2h14v28H9ZM9 6h14M9 25h14M15 28h2",
  "Følge eller selskap":
    "M4 28v-4a8 8 0 0 1 16 0v4M21 5a4 4 0 0 1 0 8m3 6a7 7 0 0 1 4 6v3M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "Hage og planter":
    "M16 28V15M16 20C6 20 4 14 4 8c8 0 12 4 12 12ZM16 15C16 7 22 4 28 4c0 8-4 12-12 11ZM10 28h12",
  "Noe annet": "M16 3a13 13 0 1 1 0 26 13 13 0 0 1 0-26ZM16 10v12M10 16h12",
};

export default function TaskIcon({
  area,
}: {
  area: (typeof taskAreas)[number] | (typeof contributionAreas)[number];
}) {
  return (
    <svg className="task-icon" viewBox="0 0 32 32" aria-hidden="true">
      <path d={paths[area]} />
    </svg>
  );
}
