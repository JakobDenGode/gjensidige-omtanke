import { taskAreas } from "@/lib/task-areas";

const paths: Record<(typeof taskAreas)[number], string> = {
  "Snømåking": "M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4M5 14l5-2-1-5M23 25l-1-5 5-2M5 18l5 2-1 5M23 7l-1 5 5 2",
  "Praktiske småting": "M6 17v11H2V17h4Zm0 2 6-4 5 1c3 0 3 4 0 4h-5m-6 6h13l10-9c2-2 0-5-3-3l-6 5M14 9c-7-4-1-11 3-6 4-5 10 2 3 6l-3 3Z",
  "Mobil og data": "M9 2h14v28H9ZM9 6h14M9 25h14M15 28h2",
  "Følge eller selskap": "M4 28v-4a8 8 0 0 1 16 0v4M21 5a4 4 0 0 1 0 8m3 6a7 7 0 0 1 4 6v3M16 9a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  "Hage og planter": "M16 28V15M16 20C6 20 4 14 4 8c8 0 12 4 12 12ZM16 15C16 7 22 4 28 4c0 8-4 12-12 11ZM10 28h12",
  "Noe annet": "M16 3a13 13 0 1 1 0 26 13 13 0 0 1 0-26ZM16 10v12M10 16h12",
};

export default function TaskIcon({ area }: { area: (typeof taskAreas)[number] }) {
  return <svg className="task-icon" viewBox="0 0 32 32" aria-hidden="true"><path d={paths[area]} /></svg>;
}
