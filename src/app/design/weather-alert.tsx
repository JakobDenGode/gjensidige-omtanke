"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useCity } from "./city-profile";
import type { WeatherSummary } from "@/lib/weather";

export default function WeatherAlert({ onHelp }: { onHelp: () => void }) {
  const { city, profile } = useCity();
  const [weather, setWeather] = useState<WeatherSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    async function load() {
      setBusy(true);
      setError("");
      setWeather(null);
      try {
        const {
          data: { session },
        } = await createSupabaseClient().auth.getSession();
        const response = await fetch("/api/weather", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ lat: city.lat, lon: city.lon }),
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(20000),
          ]),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        if (active) setWeather(result);
      } catch (error) {
        if (active)
          setError(
            error instanceof Error ? error.message : "Kunne ikke hente været.",
          );
      } finally {
        if (active) setBusy(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [city.lat, city.lon, revision]);

  const thawAdvice = Boolean(
    weather?.thawExpected &&
    (profile.snow_on_property || weather.sleetExpected || weather.snowExpected),
  );
  const precipitation =
    weather?.snowExpected && weather.sleetExpected
      ? "snø og sludd"
      : weather?.snowExpected
        ? "snø"
        : "sludd";
  return (
    <section
      className="weather-alert weather-notification"
      aria-labelledby="live-weather-title"
    >
      <div className="weather-notification-heading">
        <span className="weather-notification-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32">
            <path
              d={
                thawAdvice
                  ? "M16 24.3571V19.7143M11.3333 21.5714V16.9286M20.6667 21.5714V16.9286M25.3333 21.5714C27.9467 21.2929 30 19.1571 30 16.4643C30 13.7714 27.9467 11.6357 25.3333 11.3571C24.8667 6.62143 20.8533 3 16 3C11.8 3 8.25333 5.78571 7.04 9.59286C4.24 10.0571 2 12.5643 2 15.5357C2 18.6929 4.42667 21.2929 7.6 21.5714M11.3333 25.2857V26.2143M16 28.0714V29M20.6667 25.2857V26.2143"
                  : weather?.snowExpected
                    ? "M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4"
                  : "M16 3C13 7 6 15 6 21a10 10 0 0 0 20 0c0-6-7-14-10-18Z"
              }
              strokeWidth={thawAdvice ? 2 : undefined}
            />
          </svg>
        </span>
        <h2 id="live-weather-title" className="live-weather-title">
          {thawAdvice
            ? "Snøen kan komme til å smelte nå"
            : weather?.helpSuggested
              ? `Det er meldt ${precipitation}`
              : `Været i ${city.name}`}
        </h2>
      </div>
      {busy && <p role="status">Henter værvarsel …</p>}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      {weather && (
        <div role="status">
          <p className="weather-notification-description">
            {thawAdvice
              ? profile.has_basement
                 ? "Smeltevann kan renne inn i kjelleren. Derfor kan det være lurt å måke snø bort fra husveggen og holde sluk åpne."
                : "Plussgrader og snø eller sludd kan gi smeltevann. Hold sluk åpne og rydd våt snø der det er nødvendig."
              : weather.helpSuggested
                ? "Trenger du hjelp til å måke eller rydde våt snø? Spør noen i nettverket ditt."
                : weather.completeCoverage
                  ? "Det er ikke meldt snø eller sludd de neste 24 timene."
                  : "Det er ingen snø- eller sluddsymboler i de tilgjengelige timene."}
          </p>
          <p className="weather-notification-location">
            Værvarsel for {city.name}
          </p>
          {thawAdvice && (
            <p className="note">
              {profile.street_address
                ? `Hjemmet ditt, ${profile.street_address}. `
                : ""}
              {profile.has_basement
                ? "Du har oppgitt at hjemmet har kjeller. "
                : ""}
              {profile.insurer
                ? `Du har oppgitt ${profile.insurer} som forsikringsselskap. Dekningen er ikke verifisert.`
                : ""}
            </p>
          )}
        </div>
      )}
      {(weather?.helpSuggested || thawAdvice) && (
        <button className="button weather-notification-action" onClick={onHelp}>
          Få hjelp
          <span className="sr-only"> til å rydde snø og holde sluk åpne</span>
        </button>
      )}
      <details className="weather-notification-details">
        <summary>Om værvarselet</summary>
        <p className="note">
          Basert på byen du har lagret på kontoen din. Du kan endre den på siden
          Min profil i den nederste menyen.
        </p>
        {weather && (
          <>
            {weather.helpSuggested && (
              <p className="note">
                Varselet viser snø eller sludd i timen som starter{" "}
                {new Date(weather.winterAt!).toLocaleString("nb-NO", {
                  timeZone: "Europe/Oslo",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                . Sludd er en blanding av regn og snø.
              </p>
            )}
            {!weather.completeCoverage && (
              <p className="note">
                Vi har ikke sammenhengende timevarsler for hele det neste
                døgnet.
              </p>
            )}
            <p className="note">
              Dette er en prognose for sentrum av {city.name}, ikke en
              observasjon av været eller snø på bakken. Det kan være andre
              forhold der du bor. Nedbørstype kan variere med sted og høyde.
              Varselet sier ikke om måking er nødvendig.
            </p>
            <p className="note">
              Prognosen ble oppdatert{" "}
              {new Date(weather.updatedAt).toLocaleString("nb-NO", {
                timeZone: "Europe/Oslo",
              })}
              .
            </p>
            <details className="weather-evidence">
              <summary>Se verdiene fra Meteorologisk institutt</summary>
              <p className="note">
                Koordinater: {city.lat}, {city.lon}. Symbolene gjelder den neste
                timen. Nedbør er oppgitt som mm vann, ikke cm snø. Temperatur
                alene brukes ikke til å avgjøre nedbørstype.
              </p>
              <div className="weather-table-scroll">
                <table>
                  <caption>Timeverdier for {city.name}, norsk tid</caption>
                  <thead>
                    <tr>
                      <th scope="col">Fra</th>
                      <th scope="col">MET-symbol</th>
                      <th scope="col">°C</th>
                      <th scope="col">mm vann</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weather.samples.map((sample) => (
                      <tr key={sample.time}>
                        <td>
                          {new Date(sample.time).toLocaleString("nb-NO", {
                            timeZone: "Europe/Oslo",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>{sample.symbol}</td>
                        <td>{sample.temperature ?? "–"}</td>
                        <td>{sample.precipitation ?? "–"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </>
        )}
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Oppdater værvarsel
        </button>
        <p className="note">
          Værdata:{" "}
          <a href="https://www.met.no/" target="_blank" rel="noreferrer">
            Meteorologisk institutt
          </a>
          ,{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            target="_blank"
            rel="noreferrer"
          >
            CC BY 4.0
          </a>
          . Snøforslaget er utledet av appen.
        </p>
      </details>
    </section>
  );
}
