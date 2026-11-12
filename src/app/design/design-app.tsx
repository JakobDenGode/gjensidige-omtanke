"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AccountMenu, SavedRequests, useAccount } from "./account";
import Connections from "./connections";
import SpeechInput from "./speech-input";
import WeatherAlert from "./weather-alert";
import NetworkTasks, { NetworkRecipients } from "./network-tasks";
import { useCity } from "./city-profile";
import {
  ExampleDevices,
  ExampleFriendView,
  professionalGroups,
  type ProfessionalKind,
} from "./design-examples";

const icons = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  heart: "M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z",
  help: "M3 15h4l4-4h5a2 2 0 0 1 0 4h-4m-5 5h10l5-6M3 12v10h4V12Z",
  health: "M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z",
  phone:
    "m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3c0 3-2 5-5 4C8 19 5 16 3 8c-1-3 1-5 4-5Z",
  calendar: "M3 5h18v16H3Zm4-3v6m10-6v6M3 11h18m-14 5h3",
  home: "m3 10 9-7 9 7v11h-7v-7h-4v7H3Z",
  friends:
    "M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
  check: "m5 12 5 5L20 6",
  close: "m6 6 12 12M6 18 18 6",
  tools: "M15 3a6 6 0 0 0-8 8l-5 6a3 3 0 0 0 5 5l6-6a6 6 0 0 0 8-8l-5 4-4-4Z",
  plant:
    "M12 22V10m0 6C4 16 3 11 3 6c6 0 9 3 9 10Zm0-5c0-6 5-9 10-9 0 6-3 9-10 9ZM7 22h10",
  mic: "M8 6a4 4 0 0 1 8 0v6a4 4 0 0 1-8 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8",
  lock: "M5 10h14v12H5Zm3 0V6a4 4 0 0 1 8 0v4m-4 5v3",
} as const;

type IconName = keyof typeof icons;
function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={icons[name]} />
    </svg>
  );
}

const groups: { name: string; icon: IconName; tasks: string[] }[] = [
  {
    name: "Snømåking",
    icon: "home",
    tasks: [
      "Måke inngang og gangvei",
      "Måke innkjørselen",
      "Strø glatte partier",
    ],
  },
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
    icon: "friends",
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
const info = {
  support: {
    title: "Snakk med oss",
    text: "Få hjelp til å bruke tjenesten.",
    note: "Telefonnummer og åpningstider kommer. Ingen samtale starter i skissen.",
  },
  appointment: {
    title: "En tur i nabolaget",
    text: "Torsdag 19. november kl. 12.00. Med Anne. Møtested: hovedinngangen til biblioteket.",
    note: "Eksempelavtale. Kontakt, endring og avbestilling er ikke tilgjengelig i skissen.",
  },
  doctor: {
    title: "Lege",
    text: "Du får se lege, pris, samtaleform og ledige timer før bestilling.",
    note: "Tilbudet er ikke avklart. Ingen bestilling i skissen.",
  },
  psychologist: {
    title: "Psykolog",
    text: "Du får se psykolog, pris, samtaleform og ledige timer før bestilling.",
    note: "Ingen bestilling i skissen. Helseopplysninger deles ikke med hverdagshjelpere.",
  },
  technical: {
    title: "Rørlegger og elektriker",
    text: "Du får se fagperson, pris eller pristilbud og eventuell befaring før bestilling.",
    note: "Tilbudet er ikke avklart. Ingen bestilling i skissen.",
  },
  maintenance: {
    title: "Snekker og vedlikehold",
    text: "Du får se tilbyder og pristilbud før du bestemmer deg.",
    note: "Tilbudet er ikke avklart. Ingen bestilling i skissen.",
  },
  housekeeping: {
    title: "Rengjøring og hage",
    text: "Du får se pris og hva som inngår før bestilling.",
    note: "Tilbudet er ikke avklart. Ingen bestilling i skissen.",
  },
  doctorAppointment: {
    title: "Legetime",
    text: "Fredag 20. november kl. 14.00. Med lege Maria. Legen ringer deg.",
    note: "Eksempelavtale. Ingen legetime er bestilt. Ikke delt med venner.",
  },
  security: {
    title: "Gjør hjemmet tryggere",
    text: "Lås dører og vinduer. Bruk lys når du er borte. Avtal med noen du kjenner å se til boligen.",
    note: "Ved pågående innbrudd eller akutt fare: ring 112. Dette er et eksempel, ikke et reelt varsel om ditt område.",
  },
};
type InfoKey = keyof typeof info;
type Page =
  | "home"
  | "appointments"
  | "health"
  | "services"
  | "friends"
  | "devices"
  | "preview";
type Modal =
  "page" | "flow" | "info" | "voice" | "voice-purpose" | "complete" | null;
const navigation: { page: Page; label: string; icon: IconName }[] = [
  { page: "home", label: "Hjem", icon: "home" },
  { page: "appointments", label: "Mine avtaler", icon: "calendar" },
  { page: "friends", label: "Mine venner", icon: "friends" },
];

export default function DesignApp() {
  const { user, saveRequest } = useAccount();
  const { profile } = useCity();
  const [recipients, setRecipients] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const savingLock = useRef(false);
  const [page, setPage] = useState<Page>("home");
  const [modal, setModal] = useState<Modal>(null);
  const [mode, setMode] = useState<"request" | "offer">("request");
  const [professional, setProfessional] = useState<ProfessionalKind | null>(
    null,
  );
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(groups[0]);
  const [task, setTask] = useState("");
  const [timing, setTiming] = useState("Denne uken");
  const [description, setDescription] = useState("");
  const [infoKey, setInfoKey] = useState<InfoKey>("support");
  const [voiceText, setVoiceText] = useState("");
  const [voiceTarget, setVoiceTarget] = useState<"new" | "details">("new");
  const [exampleComplete, setExampleComplete] = useState(false);
  const [parents, setParents] = useState<Page[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const pageHeading = useRef<HTMLHeadingElement>(null);
  const isOpen = modal !== null;

  useEffect(() => {
    const element = dialog.current;
    if (!element || !isOpen) return;
    element.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (modal) heading.current?.focus();
  }, [modal, step, page]);

  useEffect(() => {
    if (!modal) pageHeading.current?.focus();
  }, [page, modal]);

  function navigate(next: Page) {
    setParents([]);
    setPage(next);
    setModal(next === "home" ? null : "page");
    if (next === "home") window.scrollTo({ top: 0 });
  }

  function startFlow(nextMode: "request" | "offer", draft = "") {
    setRecipients([]);
    if (modal === "page") setParents((current) => [...current, page]);
    setProfessional(null);
    setExampleComplete(false);
    setSaveError("");
    setMode(nextMode);
    setTask("");
    setDescription(draft);
    setTiming("Denne uken");
    setStep(1);
    setModal("flow");
  }

  function showInfo(key: InfoKey) {
    if (modal === "page") setParents((current) => [...current, page]);
    setInfoKey(key);
    setModal("info");
  }

  function openVoice(target: "new" | "details") {
    setVoiceTarget(target);
    setVoiceText(target === "details" ? description : "");
    setModal("voice");
  }

  function closeModal() {
    if (savingLock.current) return;
    if (modal === "voice" && voiceTarget === "details") setModal("flow");
    else if (parents.length) {
      setPage(parents[parents.length - 1]);
      setParents((current) => current.slice(0, -1));
      setModal("page");
    } else {
      setPage("home");
      setModal(null);
    }
  }

  function startSnowRequest() {
    setRecipients([]);
    setProfessional(null);
    setMode("request");
    setCategory(groups[0]);
    setTask(groups[0].tasks[0]);
    setDescription("");
    setTiming("Denne uken");
    setSaveError("");
    setExampleComplete(false);
    setParents([]);
    setStep(2);
    setModal("flow");
  }

  function appointmentCard() {
    return (
      <button
        className="appointment-card"
        onClick={() => showInfo("appointment")}
      >
        <span className="tag">Eksempel · Avtalt</span>
        <span className="appointment-date">
          Torsdag 19. november · kl. 12.00
        </span>
        <span className="card-title">En tur i nabolaget</span>
        <span className="person">
          <span className="avatar" aria-hidden="true">
            A
          </span>
          <span>
            Med Anne<small>Dere møtes ved biblioteket</small>
          </span>
        </span>
        <span className="card-cta">
          Se avtalen <Icon name="arrow" />
        </span>
      </button>
    );
  }

  function service(title: string, icon: IconName, action: () => void) {
    return (
      <button className="service-card" key={title} onClick={action}>
        <span className="icon-circle">
          <Icon name={icon} />
        </span>
        <span className="card-title">{title}</span>
        <Icon name="arrow" />
      </button>
    );
  }

  const titles: Record<Page, [string, string]> = {
    home: ["En god hverdag", "Hva vil du gjøre?"],
    appointments: ["Alt på ett sted", "Mine avtaler"],
    health: ["Profesjonelle helsetjenester", "Lege og psykolog"],
    services: ["Betalte tjenester", "Hus og hjem"],
    friends: ["Venner i hverdagen", "Mine venner"],
    devices: ["Tilknyttet sensorikk", "Smarte produkter"],
    preview: ["Eksempel på delt profil", "Se som venn"],
  };

  let modalTitle = "";
  if (modal === "flow")
    modalTitle =
      step === 1
        ? mode === "offer"
          ? "Hva vil du hjelpe med?"
          : "Hva trenger du hjelp til?"
        : step === 2
          ? mode === "offer"
            ? "Dette vil jeg hjelpe med"
            : "Velg hva du trenger"
          : step === 3
            ? "Når passer det?"
            : "Ser dette riktig ut?";
  if (modal === "info") modalTitle = info[infoKey].title;
  if (modal === "voice") modalTitle = "Si det med egne ord";
  if (modal === "voice-purpose") modalTitle = "Hva vil du bruke teksten til?";
  if (modal === "complete")
    modalTitle = exampleComplete
      ? "Demonstrasjon fullført"
      : "Lagret på kontoen din";
  if (modal === "page") modalTitle = titles[page][1];
  if (modal === "flow" && professional && step === 2)
    modalTitle = professionalGroups[professional].title;

  return (
    <div className="design-app">
      <a className="skip-link" href="#design-main">
        Hopp til innhold
      </a>
      <div className="prototype">
        <strong>Under utvikling</strong> · Forespørsler lagres når du er logget
        inn. Andre tjenester er eksempler.
      </div>
      <header className="design-header">
        <div className="header-inner">
          <Link className="brand" href="/">
            Gjensidige<span>En god hverdag</span>
          </Link>
          <nav className="desktop-nav" aria-label="Hovedmeny">
            {navigation.slice(0, 3).map((item) => (
              <button
                key={item.page}
                aria-current={page === item.page ? "page" : undefined}
                onClick={() => navigate(item.page)}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <AccountMenu
            onRequests={() => navigate("appointments")}
            onConnections={() => navigate("friends")}
            onDevices={() => navigate("devices")}
            onHealth={() => navigate("health")}
            onServices={() => navigate("services")}
          />
          <button
            className="support-button"
            onClick={() => showInfo("support")}
          >
            <Icon name="phone" />
            Få hjelp
          </button>
        </div>
      </header>

      <main id="design-main" className="design-main">
        <WeatherAlert onHelp={startSnowRequest} />
        <div className="intro">
          <h1 ref={pageHeading} tabIndex={-1}>
            Er det noe du trenger hjelp til?
          </h1>
        </div>

        <div className="home-layout">
          <div>
            <div className="action-grid">
              <button
                className="action-card request-card"
                onClick={() => startFlow("request")}
              >
                <span className="icon-circle">
                  <Icon name="help" />
                </span>
                <span className="card-title">Jeg trenger hjelp</span>
                <Icon name="arrow" />
              </button>
              <button
                className="action-card offer-card"
                onClick={() => startFlow("offer")}
              >
                <span className="icon-circle">
                  <Icon name="heart" />
                </span>
                <span className="card-title">Jeg kan hjelpe</span>
                <Icon name="arrow" />
              </button>
              <button
                className="action-card appointment-action"
                onClick={() => navigate("appointments")}
              >
                <span className="icon-circle">
                  <Icon name="calendar" />
                </span>
                <span className="card-title">Mine avtaler</span>
                <Icon name="arrow" />
              </button>
            </div>
            {task && (
              <button className="text-button" onClick={() => setModal("flow")}>
                Fortsett med utkastet ditt
              </button>
            )}
          </div>
        </div>

        <footer className="design-footer">
          <span>Gjensidige · En god hverdag</span>
          <button className="text-button" onClick={() => navigate("friends")}>
            <Icon name="friends" />
            Mine venner
          </button>
        </footer>
      </main>

      <div className="voice-bar">
        <button
          className="voice-launch"
          onClick={() => openVoice("new")}
          aria-haspopup="dialog"
        >
          <Icon name="mic" />
          Snakk i stedet for å skrive
        </button>
      </div>
      <nav className="mobile-nav" aria-label="Hovedmeny på mobil">
        {navigation.map((item) => (
          <button
            key={item.page}
            aria-current={
              (modal ? page : "home") === item.page ? "page" : undefined
            }
            aria-haspopup={item.page === "home" ? undefined : "dialog"}
            onClick={() => navigate(item.page)}
          >
            <Icon name={item.icon} />
            {item.label}
          </button>
        ))}
      </nav>

      <dialog
        ref={dialog}
        className="design-dialog"
        aria-labelledby="design-dialog-title"
        onCancel={(event) => {
          event.preventDefault();
          closeModal();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeModal();
        }}
      >
        <div className="dialog-inner">
          <div className="dialog-top">
            <span>
              {modal === "flow"
                ? professional
                  ? `Steg ${step - 1} av 3 · Eksempel`
                  : `Steg ${step} av 4`
                : modal === "voice" || modal === "voice-purpose"
                  ? "Tale til tekst"
                  : "En god hverdag"}
            </span>
            <button
              className="close-button"
              aria-label="Lukk"
              onClick={closeModal}
            >
              <Icon name="close" />
            </button>
          </div>
          {modal === "complete" && (
            <span className="success-icon">
              <Icon name="check" />
            </span>
          )}
          <h2 id="design-dialog-title" ref={heading} tabIndex={-1}>
            {modalTitle}
          </h2>
          {modal === "page" && (
            <>
              <p className="eyebrow">{titles[page][0]}</p>
              {page === "appointments" && (
                <>
                  <SavedRequests />
                  <NetworkTasks />
                  <h3 className="example-section-title">
                    Eksempelavtaler – ikke bestilte timer
                  </h3>
                  <div className="service-grid">
                    {appointmentCard()}
                    {service("Legetime · Eksempel", "health", () =>
                      showInfo("doctorAppointment"),
                    )}
                  </div>
                </>
              )}
              {page === "health" && (
                <>
                  <div className="service-grid">
                    {service("Lege", "health", () => showInfo("doctor"))}
                    {service("Psykolog", "heart", () =>
                      showInfo("psychologist"),
                    )}
                  </div>
                  <p className="note">
                    Ikke for akutt hjelp. Ring <a href="tel:113">113</a> ved
                    fare for liv og helse. Legevakt:{" "}
                    <a href="tel:116117">116 117</a>.
                  </p>
                </>
              )}
              {page === "services" && (
                <>
                  <div className="service-grid">
                    {service("Rørlegger og elektriker", "tools", () =>
                      showInfo("technical"),
                    )}
                    {service("Snekker og vedlikehold", "home", () =>
                      showInfo("maintenance"),
                    )}
                    {service("Rengjøring og hage", "plant", () =>
                      showInfo("housekeeping"),
                    )}
                  </div>
                  <p className="note">
                    Eksempeltjenester. Tilbyder, pris og vilkår må avklares før
                    bestilling.
                  </p>
                </>
              )}
              {page === "friends" && (
                <>
                  <Connections />
                  <button
                    className="button outline preview-launch"
                    onClick={() => {
                      setParents((current) => [...current, "friends"]);
                      setPage("preview");
                    }}
                  >
                    Se eksempel som venn
                  </button>
                </>
              )}
              {page === "devices" && <ExampleDevices />}
              {page === "preview" && <ExampleFriendView />}
            </>
          )}

          {modal === "flow" && (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (step !== 4) {
                  setStep(step + 1);
                  return;
                }
                if (professional) {
                  setExampleComplete(true);
                  setModal("complete");
                  return;
                }
                if (savingLock.current) return;
                savingLock.current = true;
                setSaving(true);
                setSaveError("");
                try {
                  await saveRequest(
                    {
                      kind: mode,
                      category: category.name,
                      task,
                      timing,
                      description: description.trim(),
                    },
                    mode === "request" ? recipients : [],
                  );
                  setTask("");
                  setModal("complete");
                } catch (error) {
                  setSaveError(
                    error instanceof Error
                      ? error.message
                      : "Kunne ikke lagre. Prøv igjen.",
                  );
                } finally {
                  savingLock.current = false;
                  setSaving(false);
                }
              }}
            >
              {step === 1 && (
                <div className="options">
                  {[...groups]
                    .sort((a, b) => {
                      const preferred =
                        mode === "offer"
                          ? profile.can_help
                          : profile.needs_help;
                      return (
                        Number(preferred.includes(b.name)) -
                        Number(preferred.includes(a.name))
                      );
                    })
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
                          {(mode === "offer"
                            ? profile.can_help
                            : profile.needs_help
                          ).includes(group.name) && (
                            <small>Valgt i profilen din</small>
                          )}
                        </span>
                        <Icon name="arrow" />
                      </button>
                    ))}
                </div>
              )}
              {step === 2 && (
                <>
                  {professional && (
                    <p className="note">
                      {professionalGroups[professional].safety}
                    </p>
                  )}
                  <fieldset className="choices">
                    <legend className="sr-only">Oppgave</legend>
                    {category.tasks.map((item) => (
                      <label className="choice" key={item}>
                        <input
                          type="radio"
                          name="task"
                          value={item}
                          checked={task === item}
                          required
                          onChange={() => setTask(item)}
                        />
                        <span>
                          <Icon name={category.icon} />
                          {item}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                </>
              )}
              {step === 3 && (
                <>
                  <fieldset className="choices">
                    <legend className="sr-only">Tidspunkt</legend>
                    {(professional
                      ? ["Så snart som mulig", "Denne uken", "Jeg er fleksibel"]
                      : ["Denne uken", "Neste uke", "Jeg er fleksibel"]
                    ).map((item) => (
                      <label className="choice" key={item}>
                        <input
                          type="radio"
                          name="timing"
                          checked={timing === item}
                          onChange={() => setTiming(item)}
                        />
                        <span>
                          <Icon name="calendar" />
                          {item}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <details className="optional-details">
                    <summary>Legg til detaljer (valgfritt)</summary>
                    <label htmlFor="design-description">
                      Ekstra opplysninger
                    </label>
                    <div className="dictation-field">
                      <textarea
                        id="design-description"
                        maxLength={2000}
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder="Bare hvis du ønsker å forklare mer."
                      />
                      <button
                        type="button"
                        className="field-mic"
                        aria-label="Tale til tekst for ekstra opplysninger"
                        onClick={() => openVoice("details")}
                      >
                        <Icon name="mic" />
                      </button>
                    </div>
                  </details>
                </>
              )}
              {step === 4 && (
                <>
                  <dl className="summary">
                    <dt>
                      {mode === "offer"
                        ? "Jeg vil hjelpe med"
                        : "Jeg trenger hjelp til"}
                    </dt>
                    <dd>{task}</dd>
                    <dt>Når</dt>
                    <dd>{timing}</dd>
                    {description.trim() && (
                      <>
                        <dt>Ekstra opplysninger</dt>
                        <dd>{description.trim()}</dd>
                      </>
                    )}
                  </dl>
                  {!professional && mode === "request" && (
                    <NetworkRecipients
                      category={category.name}
                      selected={recipients}
                      onChange={setRecipients}
                      disabled={saving}
                    />
                  )}
                  <p className="note">
                    {professional
                      ? "Demonstrasjon av betalt hjelp. Ingen forespørsel sendes eller lagres. Du må få se tilbyder, pris og vilkår før en reell bestilling."
                      : user
                        ? "Lagres på kontoen din og deles bare med vennene du velger. Ingen hjelper tildeles automatisk. Ikke legg inn helseopplysninger eller private kontaktdetaljer i beskrivelsen."
                        : "Lukk vinduet og logg inn øverst på siden. Velg deretter «Fortsett med utkastet ditt» for å lagre."}
                  </p>
                </>
              )}
              {saveError && (
                <p role="alert" className="account-error">
                  {saveError}
                </p>
              )}
              {step > 1 && (
                <div className="dialog-actions">
                  <button
                    type="button"
                    className="text-button"
                    disabled={saving}
                    onClick={() =>
                      professional && step === 2
                        ? closeModal()
                        : setStep(step - 1)
                    }
                  >
                    {step === 4 ? "Endre" : "Tilbake"}
                  </button>
                  <button
                    type="submit"
                    className="button primary"
                    disabled={saving}
                  >
                    {saving
                      ? "Lagrer …"
                      : step === 4
                        ? professional
                          ? "Bekreft eksempel"
                          : "Lagre"
                        : "Neste"}
                    <Icon name="arrow" />
                  </button>
                </div>
              )}
            </form>
          )}

          {modal === "info" && (
            <>
              <p>{info[infoKey].text}</p>
              <p className="note">{info[infoKey].note}</p>
              <button className="button outline" onClick={closeModal}>
                Lukk
              </button>
            </>
          )}
          {modal === "voice" && (
            <SpeechInput
              value={voiceText}
              onChange={setVoiceText}
              onBack={closeModal}
              onUse={() => {
                if (voiceTarget === "details") {
                  setDescription(voiceText);
                  setModal("flow");
                } else setModal("voice-purpose");
              }}
            />
          )}
          {modal === "voice-purpose" && (
            <>
              <p>
                Teksten din følger med til neste steg. Du kan fortsatt endre den
                før du går videre.
              </p>
              <div className="options">
                <button
                  className="option"
                  onClick={() => startFlow("request", voiceText)}
                >
                  Jeg trenger hjelp
                  <Icon name="arrow" />
                </button>
                <button
                  className="option"
                  onClick={() => startFlow("offer", voiceText)}
                >
                  Jeg vil hjelpe
                  <Icon name="arrow" />
                </button>
              </div>
            </>
          )}
          {modal === "complete" && (
            <>
              <p>
                {exampleComplete
                  ? "Dette var en demonstrasjon. Ingenting er sendt, bestilt eller lagret."
                  : recipients.length && mode === "request"
                    ? "Forespørselen er lagret og sendt til de valgte vennene. Du finner svar under Mine avtaler. Tid og sted må avtales separat."
                    : "Forespørselen er lagret privat under Mine avtaler. Ingen hjelper er tildelt eller avtale bestilt."}
              </p>
              <button
                className="button primary"
                onClick={() =>
                  exampleComplete ? closeModal() : navigate("appointments")
                }
              >
                {exampleComplete
                  ? "Tilbake til oversikten"
                  : "Se mine forespørsler"}
              </button>
            </>
          )}
        </div>
      </dialog>
    </div>
  );
}
