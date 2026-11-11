"use client";

import { useState } from "react";

export const professionalGroups = {
  rain: {
    name: "Vannskadeforebygging",
    title: "Hjelp før styrtregnet",
    tasks: ["Sjekke takrenner og sluk", "Rense takrenner", "Jeg er usikker"],
    safety:
      "Betalt hjelp fra fagfolk. Ikke automatisk dekket av husforsikringen. Ikke bruk stige i uvær.",
  },
  snow: {
    name: "Snømåking",
    title: "Hjelp med snømåking",
    tasks: [
      "Måke inngang og gangvei",
      "Måke innkjørselen",
      "Strø glatte partier",
    ],
    safety:
      "Betalt hjelp fra fagfolk. Tilbyder, pris og tidspunkt må avklares før bestilling.",
  },
};
export type ProfessionalKind = keyof typeof professionalGroups;

export function ExampleAlerts({
  onHelp,
  onSecurity,
}: {
  onHelp: (kind: ProfessionalKind) => void;
  onSecurity: () => void;
}) {
  const [alerts, setAlerts] = useState<(ProfessionalKind | "burglary")[]>([
    "rain",
    "snow",
    "burglary",
  ]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState("");
  const kind = alerts[index];
  const notification =
    kind === "rain"
      ? {
          title: "Beskytt kjelleren mot styrtregn",
          text: "Vil du ha hjelp med takrenner og sluk?",
        }
      : kind === "snow"
        ? { title: "Det er meldt mye snø", text: "Vil du ha hjelp med måking?" }
        : { title: "Flere innbrudd i ditt område", text: "Vær på vakt." };
  return (
    <>
      {kind && (
        <section className="weather-alert" aria-labelledby="weather-title">
          <span className="weather-icon" aria-hidden="true">
            <svg viewBox="0 0 32 32">
              <path
                d={
                  kind === "rain"
                    ? "M8 20a6 6 0 0 1-1-12 8 8 0 0 1 15-1 6 6 0 1 1 2 13M10 24l-2 4m9-4-2 4m9-4-2 4"
                    : kind === "snow"
                      ? "M16 3v26M5 9l22 14M5 23 27 9M12 5l4 4 4-4M12 27l4-4 4 4"
                      : "M7 14h18v15H7ZM11 14V8a5 5 0 0 1 10 0v6m-5 5v4"
                }
              />
            </svg>
          </span>
          <span className="weather-label">
            Eksempelvarsel · ikke basert på din adresse
          </span>
          <h2 id="weather-title">{notification.title}</h2>
          <p>{notification.text}</p>
          {kind === "rain" && (
            <p className="policy-example">
              Eksempel: husforsikring hos Gjensidige. Ingen forsikringsdata er
              hentet.
            </p>
          )}
          <div className="weather-actions">
            <button
              className="button"
              onClick={() =>
                kind === "burglary" ? onSecurity() : onHelp(kind)
              }
            >
              {kind === "burglary" ? "Se trygghetsråd" : "Finn hjelp"}
            </button>
            <button
              className="button outline"
              onClick={() => {
                const remaining = alerts.filter(
                  (_, position) => position !== index,
                );
                setAlerts(remaining);
                setIndex(Math.max(0, Math.min(index, remaining.length - 1)));
                setStatus(
                  remaining.length
                    ? "Eksempelvarselet er skjult."
                    : "Ingen flere eksempelvarsler.",
                );
              }}
            >
              Ikke nå
            </button>
          </div>
          <div className="notification-controls">
            <span role="status" aria-live="polite">
              {index + 1} / {alerts.length}
            </span>
            <div>
              <button
                className="text-button"
                disabled={index === 0}
                aria-label="Forrige varsel"
                onClick={() => setIndex(index - 1)}
              >
                ←
              </button>
              <button
                className="text-button"
                disabled={index === alerts.length - 1}
                aria-label="Neste varsel"
                onClick={() => setIndex(index + 1)}
              >
                →
              </button>
            </div>
          </div>
        </section>
      )}
      <p role="status" className="notification-status">
        {status}
      </p>
    </>
  );
}

const devices = [
  {
    name: "Vannsensor",
    location: "Kjøkken · Under vasken",
    connected: true,
    battery: "82 %",
  },
  {
    name: "Røykvarsler",
    location: "Gang · Første etasje",
    connected: true,
    battery: "94 %",
  },
  {
    name: "Dørsensor",
    location: "Ytterdør",
    connected: false,
    battery: "Ukjent",
  },
];
export function ExampleDevices() {
  return (
    <>
      <p>
        Eksempelprodukter i et hjem. Ingen sensorer er koblet til eller
        overvåkes.
      </p>
      <div className="device-grid">
        {devices.map((device) => (
          <details className="request-record device-card" key={device.name}>
            <summary>
              <span className="card-title">{device.name}</span>
              <span>{device.location}</span>
              <span className="tag">
                Eksempel: {device.connected ? "Tilkoblet" : "Frakoblet"}
              </span>
            </summary>
            <dl className="summary">
              <dt>Batteri (eksempel)</dt>
              <dd>{device.battery}</dd>
            </dl>
            {!device.connected && (
              <p>
                Sjekk batteri og tilkobling. Følg produktets bruksanvisning.
              </p>
            )}
          </details>
        ))}
      </div>
    </>
  );
}

export function ExampleFriendView() {
  const [person, setPerson] = useState("Ingrid");
  const [task, setTask] = useState("");
  const [complete, setComplete] = useState(false);
  return (
    <>
      <p className="privacy">
        Eksempelvisning med oppdiktede personer. Ikke tilgang til en ekte
        brukers data.
      </p>
      <div
        className="preview-switcher"
        role="group"
        aria-label="Velg eksempelvenn"
      >
        {["Ingrid", "Lars"].map((name) => (
          <button
            className="button outline"
            aria-pressed={person === name}
            key={name}
            onClick={() => {
              setPerson(name);
              setTask("");
              setComplete(false);
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <h3>Karis profil – sett som {person}</h3>
      <p>
        Eksempel på delt hverdagsavtale: En tur med Anne, torsdag kl. 12 ved
        biblioteket.
      </p>
      {person === "Ingrid" ? (
        <div className="request-record">
          <h3>Karis forespørsler</h3>
          <p>Eksempel: Følge til butikken denne uken.</p>
          <label htmlFor="delegated-task">Prøv en forespørsel for Kari</label>
          <select
            id="delegated-task"
            value={task}
            onChange={(event) => {
              setTask(event.target.value);
              setComplete(false);
            }}
          >
            <option value="">Velg oppgave</option>
            {["Følge til butikken", "Hente en pakke", "Gå en tur"].map(
              (item) => (
                <option key={item}>{item}</option>
              ),
            )}
          </select>
          {task && (
            <>
              <p>For Kari: {task}. Ønsket tidspunkt: denne uken.</p>
              <button
                className="button primary"
                disabled={complete}
                onClick={() => setComplete(true)}
              >
                Bekreft eksempel
              </button>
            </>
          )}
          {complete && (
            <p role="status">
              Demonstrasjon fullført. Ingenting er lagret eller sendt.
            </p>
          )}
        </div>
      ) : (
        <p className="privacy">
          I dette eksemplet har Lars ikke tilgang til forespørsler.
        </p>
      )}
      <p className="note">
        Helseopplysninger og smarte produkter er ikke delt. Reell deling krever
        egne, uttrykkelige tillatelser.
      </p>
    </>
  );
}
