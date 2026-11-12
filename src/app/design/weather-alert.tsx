"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useCity } from "./city-profile";
import type { WeatherSummary } from "@/lib/weather";


export default function WeatherAlert({ onHelp }: { onHelp: () => void }) {
  const { city } = useCity();
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setBusy(true); setError(""); setWeather(null); setDismissed(false);
      try {
        const { data: { session } } = await createSupabaseClient().auth.getSession();
        const response = await fetch("/api/weather", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token ?? ""}` },
          body: JSON.stringify({ lat: city.lat, lon: city.lon }),
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20000)]),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setWeather(result);
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : "Kunne ikke hente været.");
      } finally { if (active) setBusy(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [city.lat, city.lon, revision]);

  return <section className="weather-alert" aria-labelledby="live-weather-title">
    <h2 id="live-weather-title" className="live-weather-title">Været i {city.name}</h2>
    <p className="note">Basert på byen du har lagret på kontoen din. Du kan endre den under Min konto.</p>
    {busy && <p role="status">Henter værvarsel …</p>}
    {error && <p role="alert" className="account-error">{error}</p>}
    {weather && <div role="status">
      <h3>{weather.helpSuggested
        ? `Det er meldt ${weather.snowExpected && weather.sleetExpected ? "snø og sludd" : weather.snowExpected ? "snø" : "sludd"} i ${city.name}`
        : weather.completeCoverage ? `Ikke meldt snø eller sludd i ${city.name} de neste 24 timene` : `Ingen snø- eller sluddsymboler i de tilgjengelige timene for ${city.name}`}</h3>
      {weather.helpSuggested && <p>Varselet viser snø eller sludd i timen som starter {new Date(weather.winterAt!).toLocaleString("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. Sludd er en blanding av regn og snø. Trenger du hjelp til å måke eller rydde våt snø?</p>}
      {!weather.completeCoverage && <p className="note">Vi har ikke sammenhengende timevarsler for hele det neste døgnet.</p>}
      <p className="note">Dette er en prognose for sentrum av {city.name}, ikke en observasjon av været eller snø på bakken. Det kan være andre forhold der du bor. Nedbørstype kan variere med sted og høyde. Varselet sier ikke om måking er nødvendig.</p>
      <p className="note">Prognosen ble oppdatert {new Date(weather.updatedAt).toLocaleString("nb-NO", { timeZone: "Europe/Oslo" })}.</p>
      <details className="weather-evidence"><summary>Se verdiene fra Meteorologisk institutt</summary>
        <p className="note">Koordinater: {city.lat}, {city.lon}. Symbolene gjelder den neste timen. Nedbør er oppgitt som mm vann, ikke cm snø. Temperatur alene brukes ikke til å avgjøre nedbørstype.</p>
        <div className="weather-table-scroll"><table><caption>Timeverdier for {city.name}, norsk tid</caption><thead><tr><th scope="col">Fra</th><th scope="col">MET-symbol</th><th scope="col">°C</th><th scope="col">mm vann</th></tr></thead><tbody>{weather.samples.map((sample) => <tr key={sample.time}><td>{new Date(sample.time).toLocaleString("nb-NO", { timeZone: "Europe/Oslo", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td><td>{sample.symbol}</td><td>{sample.temperature ?? "–"}</td><td>{sample.precipitation ?? "–"}</td></tr>)}</tbody></table></div>
      </details>
    </div>}
    {weather?.helpSuggested && !dismissed && <div className="weather-actions"><button className="button" onClick={onHelp}>Jeg trenger hjelp med å måke</button><button className="button outline" onClick={() => setDismissed(true)}>Ikke nå</button></div>}
    {dismissed && <p role="status">Forslaget er skjult.</p>}
    <button className="text-button" disabled={busy} onClick={() => setRevision((value) => value + 1)}>Oppdater værvarsel</button>
    <p className="note">Værdata: <a href="https://www.met.no/" target="_blank" rel="noreferrer">Meteorologisk institutt</a>, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Snøforslaget er utledet av appen.</p>
  </section>;
}
