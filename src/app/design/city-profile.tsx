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

type Profile = {
  city: string;
  full_name: string;
  street_address: string;
  postal_code: string;
  phone: string;
  can_help: string[];
  needs_help: string[];
  preferences_completed: boolean;
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
};
const fields =
  "city,full_name,street_address,postal_code,phone,can_help,needs_help,preferences_completed";
const CityContext = createContext<{
  city: City;
  profile: Profile;
  editCity: () => void;
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
    !editing
  ) {
    return (
      <CityContext.Provider
        value={{ city, profile, editCity: () => setEditing(true) }}
      >
        {children}
      </CityContext.Provider>
    );
  }

  return (
    <>
      <header className="design-header">
        <div className="header-inner">
          <span className="brand">Gjensidige Omtanke</span>
        </div>
      </header>
      <main className="login-page">
        <h1>{editing ? "Min profil" : "Fortell litt om deg selv"}</h1>
        <p>
          Navn og by hjelper vennene dine å kjenne deg igjen. Fortell også hva
          du kan bidra med, og hva du ønsker hjelp til.
        </p>
        <p className="privacy">
          Navn, by og oppgaveønsker er synlige for venner du selv godtar.
          Adresse og telefon er valgfrie og private. Ikke legg inn
          helseopplysninger. E-post og identitet er ikke verifisert i denne
          demoen.
        </p>
        <p className="note">
          Byen brukes også til værvarsler fra Meteorologisk institutt. Du kan
          endre profilen senere under Min konto.
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
              } catch {
                setError("Kunne ikke lagre profilen din. Prøv igjen.");
              } finally {
                setBusy(false);
              }
            }}
          >
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
            <label htmlFor="profile-phone">Telefon (valgfritt, privat)</label>
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
            {(["can_help", "needs_help"] as const).map((field) => (
              <fieldset className="choices" key={field}>
                <legend>
                  {field === "can_help"
                    ? "Dette kan jeg hjelpe med"
                    : "Dette trenger jeg hjelp til"}
                </legend>
                <p className="note">
                  Velg gjerne flere. Du kan la valgene stå tomme og endre dem
                  senere.
                </p>
                {taskAreas.map((area) => (
                  <label className="choice" key={area}>
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
              </fieldset>
            ))}
            <button
              className="button primary"
              disabled={busy || !draft.city || !draft.full_name.trim()}
            >
              {busy ? "Lagrer …" : "Lagre og fortsett"}
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
    </>
  );
}
