"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SavedRequests, useAccount } from "./account";
import Connections from "./connections";
import WeatherAlert from "./weather-alert";
import NetworkTasks, { NetworkRecipients } from "./network-tasks";
import { useCity } from "./city-profile";
import Contributions from "./contributions";
import WinterRequest from "./winter-request";
import TaskReviews from "./task-reviews";
import Appointments from "./appointments";
import BrandLogo from "../brand-logo";

const icons = {
  help: "M3 15h4l4-4h5a2 2 0 0 1 0 4h-4m-5 5h10l5-6M3 12v10h4V12Z",
  offer: "M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z",
  phone:
    "m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3c0 3-2 5-5 4C8 19 5 16 3 8c-1-3 1-5 4-5Z",
  calendar: "M3 5h18v16H3Zm4-3v6m10-6v6M3 11h18",
  home: "m3 10 9-7 9 7v11h-7v-7h-4v7H3Z",
  friends:
    "M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  person: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2",
  plant:
    "M12 22V10m0 6C4 16 3 11 3 6c6 0 9 3 9 10Zm0-5c0-6 5-9 10-9 0 6-3 9-10 9ZM7 22h10",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  close: "m6 6 12 12M6 18 18 6",
  check: "m5 12 5 5L20 6",
} as const;
function Icon({ name }: { name: keyof typeof icons }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}
const groups: { name: string; icon: keyof typeof icons; tasks: string[] }[] = [
  {
    name: "Praktiske småting",
    icon: "home",
    tasks: [
      "Handle mat",
      "Hente en pakke",
      "Bære eller flytte",
      "Annen praktisk hjelp",
    ],
  },
  {
    name: "Mobil og data",
    icon: "phone",
    tasks: [
      "Bruke mobilen",
      "Videosamtale",
      "TV eller internett",
      "Annen teknisk hjelp",
    ],
  },
  {
    name: "Følge eller selskap",
    icon: "person",
    tasks: ["Gå en tur", "Ta en kaffe", "Følge til en avtale", "Besøk hjemme"],
  },
  {
    name: "Hage og planter",
    icon: "plant",
    tasks: [
      "Vanne planter",
      "Klippe plenen",
      "Stelle i hagen",
      "Annen hagehjelp",
    ],
  },
  {
    name: "Noe annet",
    icon: "help",
    tasks: [
      "Praktisk hjelp",
      "Besøk eller selskap",
      "Hjelp ute",
      "Annen hjelp",
    ],
  },
];
type View =
  | "requests"
  | "appointments"
  | "friends"
  | "contributions"
  | "support"
  | "request"
  | "winter"
  | "complete"
  | null;

export default function DesignApp() {
  const query = useSearchParams().get("view");
  const { saveRequest } = useAccount();
  const { profile } = useCity();
  const [view, setView] = useState<View>(
    query === "friends" || query === "appointments" || query === "requests" ? query : null,
  );
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(groups[0]);
  const [task, setTask] = useState("");
  const [timing, setTiming] = useState("Denne uken");
  const [description, setDescription] = useState("");
  const [recipients, setRecipients] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const homeHeading = useRef<HTMLHeadingElement>(null);
  const open = view !== null;

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    element.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);
  useEffect(() => {
    if (view) heading.current?.focus();
  }, [view, step]);

  function close() {
    if (!busyRef.current) setView(null);
  }
  function startRequest() {
    setTask("");
    setDescription("");
    setRecipients([]);
    setTiming("Denne uken");
    setError("");
    setStep(1);
    setView("request");
  }
  function startWinter() {
    setStep(1);
    setError("");
    setView("winter");
  }
  function setSaving(value: boolean) {
    busyRef.current = value;
    setBusy(value);
  }
  const titles: Record<Exclude<View, null>, string> = {
    appointments: "Mine avtaler",
    requests: "Forespørsler",
    friends: "Mine venner",
    contributions: "Jeg kan hjelpe andre",
    support: "Få hjelp",
    complete: "Forespørselen er lagret",
    winter:
      step === 1
        ? "Hva trenger du hjelp med?"
        : step === 2
          ? "Hvem vil du ha hjelp av?"
          : step === 3
            ? "Når passer det?"
            : "Ser dette riktig ut?",
    request:
      step === 1
        ? "Hva trenger du hjelp til?"
        : step === 2
          ? "Velg hva du trenger"
          : step === 3
            ? "Når passer det?"
            : "Ser dette riktig ut?",
  };

  return (
    <>
      <a className="skip-link" href="#design-main">
        Hopp til innhold
      </a>
      <header className="design-header">
        <div className="header-inner">
          <Link className="brand" href="/design">
            <BrandLogo />
          </Link>
          <button className="support-button" onClick={() => setView("support")}>
            <Icon name="phone" />
            Få hjelp
          </button>
        </div>
      </header>
      <main id="design-main" className="design-main">
        <WeatherAlert onHelp={startWinter} />
        <div className="intro">
          <h1 ref={homeHeading} tabIndex={-1}>
            Hva vil du i dag?
          </h1>
        </div>
        <div className="action-grid">
          <button className="action-card request-card" onClick={startRequest}>
            <span className="icon-circle">
              <Icon name="help" />
            </span>
            <span className="card-title">Jeg trenger hjelp</span>
          </button>
          <button
            className="action-card offer-card"
            onClick={() => setView("contributions")}
          >
            <span className="icon-circle">
              <Icon name="offer" />
            </span>
            <span className="card-title">Jeg kan hjelpe andre</span>
          </button>
          <button
            className="action-card appointment-action"
            onClick={() => setView("appointments")}
          >
            <span className="icon-circle">
              <Icon name="calendar" />
            </span>
            <span className="card-title">Mine avtaler</span>
          </button>
        </div>
        <button className="button outline requests-launch" onClick={() => setView("requests")}><Icon name="help" />Forespørsler</button>
        <footer className="design-footer">
          <span>Gjensidige</span>
        </footer>
      </main>
      <nav className="mobile-nav" aria-label="Hovedmeny">
        <button
          aria-current={!view ? "page" : undefined}
          onClick={() => {
            close();
            window.scrollTo({ top: 0 });
            homeHeading.current?.focus();
          }}
        >
          <Icon name="home" />
          Hjem
        </button>
        <button
          aria-current={view === "friends" ? "page" : undefined}
          aria-haspopup="dialog"
          onClick={() => setView("friends")}
        >
          <Icon name="friends" />
          Mine venner
        </button>
        <Link href="/design/profile">
          <Icon name="person" />
          Min profil
        </Link>
      </nav>
      <dialog
        ref={dialog}
        className={`design-dialog${view === "complete" ? "request-success-dialog" : ""}`}
        aria-labelledby="design-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-top">
            <span>
              {view === "request" || view === "winter"
                ? `Steg ${step} av 4`
                : ""}
            </span>
            <button
              className="close-button"
              disabled={busy}
              aria-label="Lukk"
              onClick={close}
            >
              <Icon name="close" />
            </button>
          </div>
          {view === "complete" && (
            <span className="success-icon">
              <Icon name="check" />
            </span>
          )}
           <h2 id="design-dialog-title" ref={heading} tabIndex={-1} className={view === "complete" ? "sr-only" : undefined}>
            {view ? titles[view] : ""}
          </h2>
          {view === "appointments" && (
            <>
              <Appointments />
            </>
          )}
          {view === "requests" && (
            <div className="requests-view">
                <SavedRequests />
                <NetworkTasks />
                <details className="appointment-request-details"><summary>Fullføring og vurderinger</summary>
                <TaskReviews />
              </details>
            </div>
          )}
          {view === "friends" && <Connections />}
          {view === "contributions" && <Contributions onClose={close} />}
          {view === "support" && (
            <>
              <p>
                Du kan oppdatere opplysningene dine under Min profil og legge
                til venner under Mine venner.
              </p>
              <p className="note">
                Kundeservice på telefon er ikke koblet til appen ennå.
              </p>
              <Link className="button outline" href="/design/profile">
                Gå til Min profil
              </Link>
            </>
          )}
          {view === "winter" && (
            <WinterRequest
              onClose={close}
              onStep={setStep}
              onBusy={setSaving}
              onSaved={() => {
                setView("complete");
              }}
            />
          )}
          {view === "request" && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (busyRef.current) return;
                if (step === 2 && !task) {
                  setError("Velg en oppgave for å gå videre.");
                  return;
                }
                if (step < 4) {
                  setError("");
                  setStep(step + 1);
                  return;
                }
                setSaving(true);
                setError("");
                try {
                  await saveRequest(
                    {
                      kind: "request",
                      category: category.name,
                      task,
                      timing,
                      description: description.trim(),
                    },
                    recipients,
                  );
                  setView("complete");
                } catch (error) {
                  setError(
                    error instanceof Error
                      ? error.message
                      : "Kunne ikke lagre forespørselen.",
                  );
                } finally {
                  setSaving(false);
                }
              }}
            >
              {step === 1 && (
                <div className="options category-step">
                  {[...groups]
                    .sort(
                      (a, b) =>
                        Number(profile.needs_help.includes(b.name)) -
                        Number(profile.needs_help.includes(a.name)),
                    )
                    .map((group) => (
                      <button
                        type="button"
                        className="option"
                        key={group.name}
                        onClick={() => {
                          setCategory(group);
                          setTask("");
                          setStep(2);
                        }}
                      >
                        <span>
                          <Icon name={group.icon} />
                          {group.name}
                        </span>
                        <Icon name="arrow" />
                      </button>
                    ))}
                  <button
                    type="button"
                    className="option"
                    onClick={startWinter}
                  >
                    <span>
                      <Icon name="home" />
                      Snømåking
                    </span>
                    <Icon name="arrow" />
                  </button>
                </div>
              )}
              {step === 2 && (
                <fieldset className="choices">
                  <legend className="sr-only">Oppgave</legend>
                  {category.tasks.map((item) => (
                    <label className="choice" key={item}>
                      <input
                        type="radio"
                        name="task"
                        checked={task === item}
                        onChange={() => setTask(item)}
                      />
                      <span>
                        <Icon name={category.icon} />
                        {item}
                      </span>
                    </label>
                  ))}
                </fieldset>
              )}
              {step === 3 && (
                <>
                  <fieldset className="choices">
                    <legend className="sr-only">Tidspunkt</legend>
                    {["Denne uken", "Neste uke", "Jeg er fleksibel"].map(
                      (item) => (
                        <label className="choice" key={item}>
                          <input
                            type="radio"
                            name="timing"
                            checked={timing === item}
                            onChange={() => setTiming(item)}
                          />
                          <span>
                            <Icon name="calendar" />
                            {item === "Jeg er fleksibel" ? "Fleksibel" : item}
                          </span>
                        </label>
                      ),
                    )}
                  </fieldset>
                  <details className="optional-details">
                    <summary>Legg til detaljer (valgfritt)</summary>
                    <label htmlFor="request-description">
                      Ekstra opplysninger
                    </label>
                    <textarea
                      id="request-description"
                      value={description}
                      maxLength={2000}
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Bare hvis du ønsker å forklare mer."
                    />
                  </details>
                </>
              )}
              {step === 4 && (
                <>
                  <dl className="summary">
                    <dt>Jeg trenger hjelp til</dt>
                    <dd>{task}</dd>
                    <dt>Ønsket tidspunkt</dt>
                    <dd>{timing}</dd>
                    {description.trim() && (
                      <>
                        <dt>Ekstra opplysninger</dt>
                        <dd>{description.trim()}</dd>
                      </>
                    )}
                  </dl>
                  <NetworkRecipients
                    category={category.name}
                    selected={recipients}
                    onChange={setRecipients}
                    disabled={busy}
                  />
                  <p className="note">
                    Deles bare med vennene du velger. Ikke skriv
                    helseopplysninger eller private kontaktdetaljer i
                    beskrivelsen.
                  </p>
                </>
              )}
              {error && (
                <p role="alert" className="account-error">
                  {error}
                </p>
              )}
              {step > 1 && (
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setError("");
                      setStep(step - 1);
                    }}
                  >
                    {step === 4 ? "Endre" : "Tilbake"}
                  </button>
                  <button className="button primary" disabled={busy}>
                    {busy ? "Lagrer …" : step === 4 ? "Be om hjelp" : "Neste"}
                    <Icon name="arrow" />
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}
