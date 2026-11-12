"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { createSupabaseClient } from "@/lib/supabase";
import CityProfile from "./city-profile";
import BrandLogo from "../brand-logo";

type RequestDraft = {
  kind: "request" | "offer";
  category: string;
  task: string;
  timing: string;
  description: string;
  tasks?: string[];
  preferred_dates?: string[];
  time_of_day?: string;
  drainage_contact_requested?: boolean;
};
type SavedRequest = RequestDraft & {
  id: string;
  user_id: string;
  status: "open" | "cancelled" | "completed";
  created_at: string;
};
const AccountContext = createContext<{
  user: User | null;
  saveRequest: (
    draft: RequestDraft,
    recipients?: string[],
    directory?: boolean,
  ) => Promise<void>;
  requests: SavedRequest[];
  loading: boolean;
  listError: string;
  refreshRequests: () => void;
  cancelRequest: (id: string) => Promise<void>;
  cancelling: string | null;
} | null>(null);

export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error("Account provider is missing.");
  return account;
}

export default function Account({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [ready, setReady] = useState(!configured);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<SavedRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [revision, setRevision] = useState(0);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    const supabase = createSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUser(session?.user ?? null);
      if (!session) setRequests([]);
      setReady(true);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      setLoading(true);
      setListError("");
      try {
        const { data, error } = await createSupabaseClient()
          .from("help_requests")
          .select(
            "id,user_id,kind,category,task,timing,description,status,created_at,tasks,preferred_dates,time_of_day,drainage_contact_requested",
          )
          .eq("user_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (error) throw error;
        if (active) setRequests(data as SavedRequest[]);
      } catch {
        if (active)
          setListError("Kunne ikke hente forespørslene dine. Prøv igjen.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user, revision]);

  async function saveRequest(
    draft: RequestDraft,
    recipients: string[] = [],
    directory = false,
  ) {
    if (!user)
      throw new Error(
        "Logg inn øverst på siden før du lagrer. Det du har fylt ut blir beholdt.",
      );
    if (!draft.task || draft.description.length > 2000)
      throw new Error(
        "Velg en oppgave og bruk maksimalt 2000 tegn i beskrivelsen.",
      );
    const { error } = await createSupabaseClient().rpc(
      directory ? "create_directory_request" : "create_network_request",
      directory ? { draft, helper: recipients[0] } : { draft, recipients },
    );
    if (error)
      throw new Error(
        "Kunne ikke lagre. Kontroller tilkoblingen og at du fortsatt er logget inn, og prøv igjen.",
      );
    setRevision((value) => value + 1);
  }

  async function cancelRequest(id: string) {
    if (!user || cancelling) return;
    setCancelling(id);
    setListError("");
    try {
      const { error } = await createSupabaseClient().rpc(
        "cancel_help_request",
        { target: id },
      );
      if (error) throw error;
      setRevision((value) => value + 1);
    } catch {
      setListError("Kunne ikke avbryte forespørselen. Prøv igjen.");
    } finally {
      setCancelling(null);
    }
  }

  return (
    <AccountContext.Provider
      value={{
        user,
        saveRequest,
        requests,
        loading,
        listError,
        refreshRequests: () => setRevision((value) => value + 1),
        cancelRequest,
        cancelling,
      }}
    >
      {!ready || !user ? (
        <>
          <header className="design-header">
            <div className="header-inner">
              <span className="brand">
                <BrandLogo />
              </span>
            </div>
          </header>
          <main className="login-page">
            <section className="account-panel" aria-labelledby="account-title">
              <p className="eyebrow">En god hverdag</p>
              <h1 id="account-title">
                {authMode === "signup" ? "Opprett konto" : "Velkommen tilbake"}
              </h1>
              <p>
                Logg inn for å bruke tjenesten og se dine forespørsler og
                tilbud.
              </p>
              {!ready ? (
                <p role="status">Laster konto …</p>
              ) : !configured ? (
                <p role="alert">
                  Supabase er ikke konfigurert. Legg til miljøvariablene før du
                  logger inn.
                </p>
              ) : (
                <form
                  className="account-form"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (busy) return;
                    const form = event.currentTarget;
                    const fields = new FormData(form);
                    const email = String(fields.get("email")).trim();
                    const password = String(fields.get("password"));
                    setBusy(true);
                    setError("");
                    setMessage("");
                    try {
                      const supabase = createSupabaseClient();
                      const result =
                        authMode === "signup"
                          ? await supabase.auth.signUp({
                              email,
                              password,
                              options: {
                                emailRedirectTo: `${window.location.origin}/design`,
                              },
                            })
                          : await supabase.auth.signInWithPassword({
                              email,
                              password,
                            });
                      if (result.error) throw result.error;
                      form.reset();
                      if (authMode === "signup" && !result.data.session)
                        setMessage(
                          "Sjekk e-posten din for å bekrefte kontoen. Logg deretter inn her. Hvis adressen allerede er registrert, kan du logge inn.",
                        );
                    } catch (error) {
                      const code =
                        error && typeof error === "object" && "code" in error
                          ? error.code
                          : undefined;
                      const authErrors: Record<string, string> = {
                        over_email_send_rate_limit:
                          "E-posttjenesten har nådd grensen for bekreftelsesmeldinger. Dette skyldes ikke e-postadressen eller passordet ditt. Prøv senere; tjenesten må få økt sendekapasitet før alle kan registrere seg.",
                        over_request_rate_limit:
                          "For mange forsøk på kort tid. Vent litt før du prøver igjen.",
                        email_not_confirmed:
                          "Bekreft e-postadressen via lenken i e-posten før du logger inn. Sjekk også søppelpost.",
                        email_address_not_authorized:
                          "E-posttjenesten tillater ikke sending til denne adressen ennå. Tjenesten må konfigurere e-postlevering for nye brukere.",
                        weak_password:
                          "Passordet oppfyller ikke sikkerhetskravene. Velg et sterkere passord med minst 8 tegn.",
                        signup_disabled:
                          "Registrering av nye kontoer er midlertidig deaktivert.",
                      };
                      setError(
                        (typeof code === "string" && authErrors[code]) ||
                          (authMode === "signup"
                            ? "Kunne ikke opprette konto. Bruk en gyldig e-post og minst 8 tegn i passordet. Prøv igjen senere hvis du har gjort mange forsøk."
                            : "Kunne ikke logge inn. Kontroller e-post, passord og at e-posten er bekreftet."),
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <label htmlFor="account-email">E-post</label>
                  <input
                    id="account-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    required
                    disabled={busy}
                  />
                  <label htmlFor="account-password">
                    Passord{authMode === "signup" ? " (minst 8 tegn)" : ""}
                  </label>
                  <input
                    id="account-password"
                    name="password"
                    type="password"
                    autoComplete={
                      authMode === "signup"
                        ? "new-password"
                        : "current-password"
                    }
                    minLength={authMode === "signup" ? 8 : undefined}
                    required
                    disabled={busy}
                  />
                  <button className="button primary" disabled={busy}>
                    {busy
                      ? "Vennligst vent …"
                      : authMode === "signup"
                        ? "Opprett konto"
                        : "Logg inn"}
                  </button>
                  <button
                    type="button"
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setAuthMode(authMode === "signin" ? "signup" : "signin");
                      setError("");
                      setMessage("");
                    }}
                  >
                    {authMode === "signin"
                      ? "Ny her? Opprett konto"
                      : "Har du konto? Logg inn"}
                  </button>
                </form>
              )}
              {error && (
                <p role="alert" className="account-error">
                  {error}
                </p>
              )}
              {message && <p role="status">{message}</p>}
            </section>
          </main>
        </>
      ) : (
        <CityProfile key={user.id} userId={user.id}>
          {children}
        </CityProfile>
      )}
    </AccountContext.Provider>
  );
}

export function SavedRequests() {
  const {
    user,
    requests,
    loading,
    listError,
    refreshRequests,
    cancelRequest,
    cancelling,
  } = useAccount();
  const ownRequests = requests.filter(
    (request) => request.user_id === user?.id,
  );
  return (
    <section aria-labelledby="requests-title">
      <h3 id="requests-title">Du trenger hjelp</h3>
      <button
        className="text-button"
        disabled={loading}
        onClick={refreshRequests}
      >
        Oppdater listen
      </button>
      {loading && <p role="status">Henter forespørsler …</p>}
      {listError && (
        <p role="alert" className="account-error">
          {listError}
        </p>
      )}
      {!loading && !listError && !ownRequests.length && (
        <p>Du har ingen lagrede forespørsler eller tilbud ennå.</p>
      )}
      <div className="request-list">
        {ownRequests.map((request) => (
          <article className="request-record" key={request.id}>
            <span className="tag">
              {request.status === "cancelled"
                ? "Avbrutt"
                : request.status === "completed"
                  ? "Fullført"
                  : request.kind === "offer"
                    ? "Tilbud om hjelp"
                    : "Venter på hjelp"}
            </span>
            <h3>
              {request.tasks?.length ? request.tasks.join(" · ") : request.task}
            </h3>
            <p>
              Ønsket tidspunkt: {request.timing.toLocaleLowerCase("nb-NO")}.
            </p>
            <details className="request-card-details">
              <summary>Se forespørselen</summary>
              {request.drainage_contact_requested && (
                <p className="note">
                  Du har registrert interesse for fagpersonkontakt om drenering.
                  Ingen kontakt er sendt automatisk.
                </p>
              )}
              {Boolean(request.preferred_dates?.length) && (
                <p>
                  Datoer som passer:{" "}
                  {request.preferred_dates
                    ?.map((date) =>
                      new Date(`${date}T12:00:00Z`).toLocaleDateString(
                        "nb-NO",
                        {
                          timeZone: "Europe/Oslo",
                        },
                      ),
                    )
                    .join(", ")}{" "}
                  · {request.time_of_day}
                </p>
              )}
              <p>
                {request.kind === "offer"
                  ? "Jeg kan hjelpe"
                  : "Jeg trenger hjelp"}{" "}
                · {request.timing}
              </p>
              {request.description && (
                <p className="request-description">{request.description}</p>
              )}
              <p className="note">
                Opprettet{" "}
                {new Date(request.created_at).toLocaleDateString("nb-NO")}
              </p>
              {request.status === "open" && (
                <button
                  className="button outline"
                  disabled={cancelling !== null}
                  onClick={() => {
                    if (window.confirm("Vil du avbryte denne forespørselen?"))
                      void cancelRequest(request.id);
                  }}
                >
                  {cancelling === request.id
                    ? "Avbryter …"
                    : "Avbryt forespørsel"}
                </button>
              )}
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}
