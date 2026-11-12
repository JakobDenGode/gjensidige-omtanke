"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { cities, type City } from "@/lib/cities";
import { taskAreas } from "@/lib/task-areas";
import { createSupabaseClient } from "@/lib/supabase";
import { usePathname } from "next/navigation";
import ProfileNavigation from "./profile-navigation";
import Household from "./household";
import BrandLogo from "../brand-logo";
import ProfilePhoto from "./profile-photo";

type Profile = {
  city: string;
  full_name: string;
  street_address: string;
  postal_code: string;
  phone: string;
  can_help: string[];
  needs_help: string[];
  preferences_completed: boolean;
  home_type: string;
  has_basement: boolean;
  snow_on_property: boolean;
  insurer: string;
};
const emptyProfile: Profile = {
  city: "",
  full_name: "",
  street_address: "",
  postal_code: "",
  phone: "",
  can_help: [],
  needs_help: [],
  preferences_completed: false,
  home_type: "",
  has_basement: false,
  snow_on_property: false,
  insurer: "",
};
const fields =
  "city,full_name,street_address,postal_code,phone,can_help,needs_help,preferences_completed,home_type,has_basement,snow_on_property,insurer";
const CityContext = createContext<{
  city: City;
  profile: Profile;
  editCity: () => void;
  reloadProfile: () => void;
} | null>(null);
export function useCity() {
  const context = useContext(CityContext);
  if (!context) throw new Error("Customer profile is missing");
  return context;
}

export default function CityProfile({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [draft, setDraft] = useState<Profile>(emptyProfile);
  const [exists, setExists] = useState(false);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const profilePage = usePathname() === "/design/profile";
  const [message, setMessage] = useState("");
  const city = cities.find((item) => item.name === profile.city);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await createSupabaseClient()
          .from("customer_profiles")
          .select(fields)
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;
        setExists(Boolean(data));
        setProfile(data ?? emptyProfile);
        setDraft(data ?? emptyProfile);
        setError("");
        setReady(true);
      } catch {
        if (active) setError("Kunne ikke hente profilen din. Prøv igjen.");
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [userId, revision]);

  if (
    ready &&
    city &&
    profile.full_name.trim() &&
    profile.preferences_completed &&
    !editing &&
    !profilePage
  ) {
    return (
      <CityContext.Provider
        value={{
          city,
          profile,
          editCity: () => setEditing(true),
          reloadProfile: () => setRevision((value) => value + 1),
        }}
      >
        {children}
      </CityContext.Provider>
    );
  }

  return (
    <>
      <header className="design-header">
        <div className="header-inner">
          <span className="brand">
            <BrandLogo />
          </span>
        </div>
      </header>
      <main className="login-page profile-onboarding">
        <p className="eyebrow">Din hverdag, ditt nettverk</p>
        <h1>
          {editing || profilePage ? "Min profil" : "Fortell litt om deg selv"}
        </h1>
        <p>
          Navn og by hjelper vennene dine å kjenne deg igjen. Fortell også hva
          du kan bidra med, og hva du ønsker hjelp til.
        </p>
        <details className="profile-privacy">
          <summary>Hvem kan se opplysningene mine?</summary>
          <p className="privacy">
            Navn, by og oppgaveønsker er synlige for venner du selv godtar.
            Adresse og telefon er valgfrie og private. Ikke legg inn
            helseopplysninger. E-post og identitet er ikke verifisert i denne
            demoen.
          </p>
        </details>
        <p className="note">
          Byen brukes også til værvarsler fra Meteorologisk institutt. Du kan
          endre opplysningene senere under Min profil.
        </p>
        {!ready ? (
          <>
            <p role="status">Henter profilen din …</p>
            {error && (
              <button
                className="button outline"
                onClick={() => setRevision((value) => value + 1)}
              >
                Prøv igjen
              </button>
            )}
          </>
        ) : (
          <form
            className="account-form"
            onSubmit={async (event) => {
              event.preventDefault();
              if (
                busy ||
                !cities.some((item) => item.name === draft.city) ||
                !draft.full_name.trim()
              )
                return;
              setBusy(true);
              setError("");
              setMessage("");
              try {
                const profiles =
                  createSupabaseClient().from("customer_profiles");
                const values = {
                  ...draft,
                  full_name: draft.full_name.trim(),
                  street_address: draft.street_address.trim(),
                  phone: draft.phone.trim(),
                  preferences_completed: true,
                };
                const operation = exists
                  ? profiles.update(values).eq("user_id", userId)
                  : profiles.insert({ user_id: userId, ...values });
                const { data, error } = await operation.select(fields).single();
                if (error) throw error;
                setProfile(data);
                setDraft(data);
                setExists(true);
                setEditing(false);
                setMessage("Profilen din er oppdatert.");
              } catch {
                setError("Kunne ikke lagre profilen din. Prøv igjen.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <section
              className="profile-basics"
              aria-labelledby="profile-basics-title"
            >
              <h2 id="profile-basics-title">Om deg</h2>
              <label htmlFor="profile-name">Fullt navn</label>
              <input
                id="profile-name"
                value={draft.full_name}
                onChange={(event) =>
                  setDraft({ ...draft, full_name: event.target.value })
                }
                autoComplete="name"
                maxLength={80}
                required
                disabled={busy}
              />
              <label htmlFor="profile-city">By</label>
              <select
                id="profile-city"
                value={draft.city}
                onChange={(event) =>
                  setDraft({ ...draft, city: event.target.value })
                }
                required
                disabled={busy}
              >
                <option value="">Velg by</option>
                {cities.map((item) => (
                  <option key={item.name}>{item.name}</option>
                ))}
              </select>
            </section>
            <details className="profile-contact">
              <summary>
                Adresse og telefon <span>(valgfritt)</span>
              </summary>
              <div className="profile-contact-fields">
                <label htmlFor="profile-address">
                  Gateadresse (valgfritt, privat)
                </label>
                <input
                  id="profile-address"
                  value={draft.street_address}
                  onChange={(event) =>
                    setDraft({ ...draft, street_address: event.target.value })
                  }
                  autoComplete="street-address"
                  maxLength={200}
                  disabled={busy}
                />
                <label htmlFor="profile-postal">Postnummer (valgfritt)</label>
                <input
                  id="profile-postal"
                  value={draft.postal_code}
                  onChange={(event) =>
                    setDraft({ ...draft, postal_code: event.target.value })
                  }
                  autoComplete="postal-code"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  disabled={busy}
                />
                <label htmlFor="profile-phone">
                  Telefon (valgfritt, privat)
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  value={draft.phone}
                  onChange={(event) =>
                    setDraft({ ...draft, phone: event.target.value })
                  }
                  autoComplete="tel"
                  maxLength={30}
                  disabled={busy}
                />
              </div>
            </details>
            <section
              className="profile-basics"
              aria-labelledby="property-title"
            >
              <h2 id="property-title">Bolig og forsikring</h2>
              <p className="note">
                Opplysningene er dine egne og ikke verifisert hos et
                forsikringsselskap. Vi kan ikke bekrefte dekning eller om en
                skade dekkes.
              </p>
              <label htmlFor="home-type">Boligtype</label>
              <select
                id="home-type"
                value={draft.home_type}
                onChange={(e) =>
                  setDraft({ ...draft, home_type: e.target.value })
                }
                disabled={busy}
              >
                <option value="">Ikke oppgitt</option>
                {["Enebolig", "Rekkehus", "Leilighet", "Annet"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <label className="profile-checkbox">
                <input
                  type="checkbox"
                  checked={draft.has_basement}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, has_basement: e.target.checked })
                  }
                />
                <span>Boligen har kjeller</span>
              </label>
              <label className="profile-checkbox">
                <input
                  type="checkbox"
                  checked={draft.snow_on_property}
                  disabled={busy}
                  onChange={(e) =>
                    setDraft({ ...draft, snow_on_property: e.target.checked })
                  }
                />
                <span>Det ligger snø på eiendommen nå</span>
              </label>
              <p className="note">
                Oppdater snøvalget når forholdene endrer seg. Vi måler ikke snø
                på eiendommen.
              </p>
              <label htmlFor="insurer">
                Forsikringsselskap (egenoppgitt, valgfritt)
              </label>
              <input
                id="insurer"
                value={draft.insurer}
                maxLength={100}
                disabled={busy}
                onChange={(e) =>
                  setDraft({ ...draft, insurer: e.target.value })
                }
              />
            </section>
            {(["can_help", "needs_help"] as const).map((field) => (
              <fieldset
                className={`profile-preferences profile-preferences-${field}`}
                key={field}
              >
                <legend>
                  {field === "can_help"
                    ? "Dette kan jeg hjelpe med"
                    : "Dette trenger jeg hjelp til"}
                </legend>
                <p className="note">
                  Velg gjerne flere. Du kan la valgene stå tomme og endre dem
                  senere.
                </p>
                <div className="profile-checkbox-grid">
                  {taskAreas.map((area) => (
                    <label className="profile-checkbox" key={area}>
                      <input
                        type="checkbox"
                        checked={draft[field].includes(area)}
                        disabled={busy}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            [field]: event.target.checked
                              ? [...draft[field], area]
                              : draft[field].filter((item) => item !== area),
                          })
                        }
                      />
                      <span>{area}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              className="button primary"
              disabled={busy || !draft.city || !draft.full_name.trim()}
            >
              {busy
                ? "Lagrer …"
                : profilePage
                  ? "Lagre endringer"
                  : "Lagre og fortsett"}
            </button>
            {editing && (
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => {
                  setDraft(profile);
                  setEditing(false);
                }}
              >
                Avbryt
              </button>
            )}
          </form>
        )}
        {profilePage && ready && (
          <>
            <ProfilePhoto userId={userId} name={profile.full_name} />
            <Household userId={userId} />
          </>
        )}
        {message && <p role="status">{message}</p>}
        {error && (
          <p role="alert" className="account-error">
            {error}
          </p>
        )}
        <button
          className="text-button"
          disabled={busy}
          onClick={async () => {
            const { error } = await createSupabaseClient().auth.signOut();
            if (error) setError("Kunne ikke logge ut. Prøv igjen.");
          }}
        >
          Logg ut
        </button>
      </main>
      {profilePage && <ProfileNavigation />}
    </>
  );
}
