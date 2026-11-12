"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { cities, type City } from "@/lib/cities";
import { createSupabaseClient } from "@/lib/supabase";

const CityContext = createContext<{ city: City; editCity: () => void } | null>(null);
export function useCity() {
  const context = useContext(CityContext);
  if (!context) throw new Error("City profile is missing");
  return context;
}

export default function CityProfile({ userId, children }: { userId: string; children: ReactNode }) {
  const [city, setCity] = useState<City | null>(null);
  const [selected, setSelected] = useState("");
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const { data, error } = await createSupabaseClient().from("customer_profiles")
          .select("city").eq("user_id", userId).maybeSingle();
        if (error) throw error;
        if (!active) return;
        const saved = cities.find((item) => item.name === data?.city) ?? null;
        setCity(saved); setSelected(saved?.name ?? ""); setError(""); setReady(true);
      } catch {
        if (active) setError("Kunne ikke hente byen din. Prøv igjen.");
      }
    }
    void load();
    return () => { active = false; };
  }, [userId, revision]);

  if (ready && city && !editing) return <CityContext.Provider value={{ city, editCity: () => setEditing(true) }}>{children}</CityContext.Provider>;

  return <>
    <header className="design-header"><div className="header-inner"><span className="brand">Gjensidige Omtanke</span></div></header>
    <main className="login-page">
      <h1>{editing ? "Endre by" : "Hvor bor du?"}</h1>
      <p>Velg byen som passer best. Vi lagrer den på kontoen din og bruker den til lokale værvarsler. Du trenger ikke oppgi adresse eller dele posisjonen din.</p>
      <p className="note">Byens omtrentlige koordinater sendes til Meteorologisk institutt når værvarselet hentes. Du kan endre byen senere under Min konto.</p>
      {!ready ? <><p role="status">Henter profilen din …</p>{error && <button className="button outline" onClick={() => setRevision((value) => value + 1)}>Prøv igjen</button>}</> : <form className="account-form" onSubmit={async (event) => {
        event.preventDefault();
        if (busy || !cities.some((item) => item.name === selected)) return;
        setBusy(true); setError("");
        try {
          const profiles = createSupabaseClient().from("customer_profiles");
          const operation = city
            ? profiles.update({ city: selected }).eq("user_id", userId)
            : profiles.insert({ user_id: userId, city: selected });
          const { data, error } = await operation.select("city").single();
          if (error) throw error;
          const saved = cities.find((item) => item.name === data.city);
          if (!saved) throw new Error("Unknown city");
          setCity(saved); setEditing(false);
        } catch { setError("Kunne ikke lagre byen din. Prøv igjen."); }
        finally { setBusy(false); }
      }}>
        <label htmlFor="profile-city">By</label>
        <select id="profile-city" value={selected} onChange={(event) => setSelected(event.target.value)} required disabled={busy}><option value="">Velg by</option>{cities.map((item) => <option key={item.name}>{item.name}</option>)}</select>
        <button className="button primary" disabled={busy || !selected}>{busy ? "Lagrer …" : "Lagre og fortsett"}</button>
        {editing && <button type="button" className="text-button" disabled={busy} onClick={() => { setSelected(city?.name ?? ""); setEditing(false); }}>Avbryt</button>}
      </form>}
      {error && <p role="alert" className="account-error">{error}</p>}
      <button className="text-button" onClick={async () => {
        const { error } = await createSupabaseClient().auth.signOut();
        if (error) setError("Kunne ikke logge ut. Prøv igjen.");
      }}>Logg ut</button>
    </main>
  </>;
}
