const paths: Record<string, string> = {
  "Måke inngang og gangvei": "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
  "Måke innkjørselen": "M7 3 3 21m14-18 4 18M12 4v3m0 4v3m0 4v3",
  "Flytte snø bort fra husveggen": "m2 8 7-5 7 5M4 7v10h10V7M8 11h3v6m5 3h6m-3-3 3 3-3 3",
  "Fjerne snø rundt sluk og avløp": "M8 2c-2 3-5 6-5 9a5 5 0 0 0 10 0c0-3-3-6-5-9ZM3 20h18m-6-5h6v8m-6-4v4m3-4v4",
  "Strø glatte partier": "m7 3 10 3-2 7-10-3ZM10 4l-2 7m0 5v1m4-1v1m4-1v1M3 21h18",
};

export default function WinterTaskIcon({ task }: { task: string }) {
  return <svg className="task-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[task]} /></svg>;
}
