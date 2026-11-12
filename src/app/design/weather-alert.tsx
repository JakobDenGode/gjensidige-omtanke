"use client";

import { useEffect, useRef, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

const places = [
  { name: "Oslo", lat: 59.91, lon: 10.75 },
  { name: "Bergen", lat: 60.39, lon: 5.32 },
  { name: "Trondheim", lat: 63.43, lon: 10.4 },
  { name: "Stavanger", lat: 58.97, lon: 5.73 },
  { name: "Tromsø", lat: 69.65, lon: 18.96 },
];
type Weather = { snowExpected: boolean; snowAt: string | null; updatedAt: string };

export default function WeatherAlert({ onHelp }: { onHelp: () => void }) {
  const [place, setPlace] = useState("");
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState<Weather | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);

  async function load(lat: number, lon: number, name: string, id: number) {
    try {
      const { data: { session } } = await createSupabaseClient().auth.getSession();
      const response = await fetch("/api/weather", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
        body: JSON.stringify({ lat, lon }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      if (id !== generation.current) return;
      setWeather(result); setLocation(name);
    } catch (error) {
      if (id === generation.current) setError(error instanceof Error ? error.message : "Kunne ikke hente været.");
    } finally { if (id === generation.current) setBusy(false); }
  }

  function fetchWeather(usePosition: boolean) {
    const id = ++generation.current;
    setBusy(true); setError(""); setWeather(null); setDismissed(false);
    if (!usePosition) {
      const selected = places.find((item) => item.name === place);
      if (selected) void load(selected.lat, selected.lon, selected.name, id);
      else setBusy(false);
      return;
    }
    if (!navigator.geolocation) { setError("Nettleseren støtter ikke posisjon. Velg en by i stedet."); setBusy(false); return; }
    navigator.geolocation.getCurrentPosition((position) => {
      if (id === generation.current) void load(Number(position.coords.latitude.toFixed(2)), Number(position.coords.longitude.toFixed(2)), "ditt område", id);
    }, () => {
      if (id === generation.current) { setError("Kunne ikke hente posisjonen. Velg en by i stedet."); setBusy(false); }
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
  }

  return <section className="weather-alert" aria-labelledby="live-weather-title">
    <h2 id="live-weather-title" className="live-weather-title">Været der du er</h2>
    <p>Velg en by eller del omtrentlig posisjon for å se om det er meldt snø.</p>
    <p className="note">Posisjon sendes via appen til Meteorologisk institutt, avrundet til to desimaler. Den lagres ikke på kontoen din. Byvalg krever ingen posisjonstilgang.</p>
    <form className="weather-location" onSubmit={(event) => { event.preventDefault(); fetchWeather(false); }}>
      <label htmlFor="weather-place">Velg by</label>
      <select id="weather-place" value={place} disabled={busy} onChange={(event) => { generation.current++; setPlace(event.target.value); setWeather(null); setError(""); }} required><option value="">Velg by</option>{places.map((item) => <option key={item.name}>{item.name}</option>)}</select>
      <button className="button outline" disabled={busy || !place}>Hent værvarsel</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => fetchWeather(true)}>Bruk min posisjon</button>
    </form>
    {busy && <p role="status">Henter værvarsel …</p>}
    {error && <p role="alert" className="account-error">{error}</p>}
    {weather && <div role="status">
      <h3>{weather.snowExpected ? `Det er meldt snø i ${location}` : `Ingen snø i timevarselet for ${location}`}</h3>
      {weather.snowExpected && <p>Varselet viser snø rundt {new Date(weather.snowAt!).toLocaleString("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Kanskje du trenger hjelp til å måke?</p>}
      <p className="note">Basert på tilgjengelige timevarsler de neste 24 timene. Dette er en prognose, ikke en måling av snø på bakken eller et farevarsel.</p>
      <p className="note">Prognosen ble oppdatert {new Date(weather.updatedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
    </div>}
    {weather?.snowExpected && !dismissed && <div className="weather-actions"><button className="button" onClick={onHelp}>Jeg trenger hjelp med å måke</button><button className="button outline" onClick={() => setDismissed(true)}>Ikke nå</button></div>}
    {dismissed && <p role="status">Forslaget er skjult.</p>}
    <p className="note">Værdata: <a href="https://www.met.no/" target="_blank" rel="noreferrer">Meteorologisk institutt</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Snøforslaget er utledet av appen.</p>
  </section>;
}
