"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { cities } from "@/lib/cities";
type Shared = {
  share_appointments: boolean;
  share_weather: boolean;
  share_requests: boolean;
  weather_city?: string;
  appointments?: {
    title: string;
    starts_at: string;
    meeting_place: string;
    status: string;
  }[];
  requests?: { task: string; timing: string; status: string }[];
};
export default function SharedFriend({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [shared, setShared] = useState<Shared | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [weather, setWeather] = useState("");
  useEffect(() => {
    let active = true;
    void createSupabaseClient()
      .rpc("shared_friend_details", { target: id })
      .then(async ({ data, error }) => {
        if (!active) return;
        if (error) {
          setError("Kunne ikke hente delte opplysninger.");
          return;
        }
        setShared(data);
        setError("");
        const city = cities.find((c) => c.name === data.weather_city);
        if (city && data.share_weather) {
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
              signal: AbortSignal.timeout(20000),
            });
            const result = await response.json();
            if (!response.ok) throw Error();
            if (active)
              setWeather(
                result.snowExpected
                  ? "Det er meldt snø."
                  : result.sleetExpected
                    ? "Det er meldt sludd."
                    : "Ingen snø eller sludd i de tilgjengelige timevarslene.",
              );
          } catch {
            if (active) setWeather("Værvarselet kunne ikke hentes.");
          }
        }
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  return (
    <section className="friend-shared-panel">
      <h3>Tilgang delt av {name}</h3>
      {error && <p role="alert">{error}</p>}
      {!shared && !error && <p role="status">Henter tilgang …</p>}
      {shared && (
        <>
          {shared.share_appointments ? (
            <>
              <h3>Hverdagsavtaler</h3>
              {shared.appointments?.length ? (
                shared.appointments.map((a, i) => (
                  <article className="appointment-display" key={i}>
                    <h3>{a.title}</h3>
                    <p>
                      {new Date(a.starts_at).toLocaleString("nb-NO", {
                        timeZone: "Europe/Oslo",
                      })}
                    </p>
                    <p>{a.meeting_place}</p>
                    <span className="tag">
                      {a.status === "confirmed"
                        ? "Bekreftet"
                        : a.status === "cancelled"
                          ? "Avlyst"
                          : "Forslag"}
                    </span>
                  </article>
                ))
              ) : (
                <p>Ingen avtaler.</p>
              )}
            </>
          ) : (
            <p>Hverdagsavtaler er ikke delt.</p>
          )}
          {shared.share_weather ? (
            <>
              <h3>Værvarsel for {shared.weather_city}</h3>
              <p>{weather || "Henter vær …"}</p>
              <p className="note">
                Prognose fra Meteorologisk institutt (CC BY 4.0), ikke en
                observasjon av eiendommen.
              </p>
            </>
          ) : (
            <p>Værvarsler er ikke delt.</p>
          )}
          {shared.share_requests ? (
            <>
              <h3>Forespørsler</h3>
              {shared.requests?.map((r, i) => (
                <p key={i}>
                  {r.task} · {r.timing} ·{" "}
                  {r.status === "open"
                    ? "Åpen"
                    : r.status === "completed"
                      ? "Fullført"
                      : "Avbrutt"}
                </p>
              ))}
              <form
                className="account-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (busy) return;
                  const form = e.currentTarget;
                  const data = new FormData(form);
                  setBusy(true);
                  setError("");
                  try {
                    const { error } = await createSupabaseClient().rpc(
                      "create_request_for_friend",
                      {
                        owner: id,
                        task_text: String(data.get("task")).trim(),
                        desired_time: String(data.get("timing")),
                      },
                    );
                    if (error) throw error;
                    form.reset();
                    setMessage(
                      `Forespørselen er lagret for ${name}. Ingen hjelper er tildelt.`,
                    );
                    setRevision((v) => v + 1);
                  } catch {
                    setError(
                      "Kunne ikke lagre. Tillatelsen kan ha blitt trukket tilbake.",
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label htmlFor={`friend-task-${id}`}>
                  Lag forespørsel for {name}
                </label>
                <input
                  id={`friend-task-${id}`}
                  name="task"
                  maxLength={200}
                  required
                  disabled={busy}
                />
                <label htmlFor={`friend-time-${id}`}>Ønsket tidspunkt</label>
                <select id={`friend-time-${id}`} name="timing" disabled={busy}>
                  {["Denne uken", "Neste uke", "Jeg er fleksibel"].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
                <button className="button primary" disabled={busy}>
                  Lagre forespørsel
                </button>
              </form>
            </>
          ) : (
            <p>Forespørsler er ikke delt.</p>
          )}
        </>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
