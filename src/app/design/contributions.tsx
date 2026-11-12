"use client";

import { useState } from "react";
import { useCity } from "./city-profile";
import { createSupabaseClient } from "@/lib/supabase";
import { useAccount } from "./account";
import { contributionAreas } from "@/lib/task-areas";
import TaskIcon from "./task-icon";

export default function Contributions({ onClose }: { onClose: () => void }) {
  const { profile, reloadProfile } = useCity();
  const { user } = useAccount();
  const [selected, setSelected] = useState(profile.can_help);
  const [travel, setTravel] = useState(profile.travel_km);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const { error } = await createSupabaseClient()
            .from("customer_profiles")
            .update({ can_help: selected, travel_km: travel })
            .eq("user_id", user!.id)
            .select("user_id")
            .single();
          if (error) throw error;
          reloadProfile();
          onClose();
        } catch {
          setError("Kunne ikke lagre valgene dine. Prøv igjen.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <p>
        Velg én eller flere ting du har lyst til å bidra med. Vennene dine ser
        valgene dine.
      </p>
      <fieldset className="contribution-section">
        <legend>Dette kan {profile.full_name} bidra med</legend>
        <div className="contribution-options">
          {contributionAreas.map((area) => (
            <label className="choice" key={area}>
              <input
                type="checkbox"
                disabled={busy}
                checked={selected.includes(area)}
                onChange={(event) =>
                  setSelected(
                    event.target.checked
                      ? [...selected, area]
                      : selected.filter((item) => item !== area),
                  )
                }
              />
              <TaskIcon area={area} />
              <span>{area}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="note" role="status">
        {selected.length} aktiviteter valgt
      </p>
      <fieldset className="choices">
        <legend>Hvor langt vil du reise for å bidra?</legend>
        {[1, 3, 9].map((km) => (
          <label className="choice" key={km}>
            <input
              type="radio"
              name="travel-distance"
              checked={travel === km}
              disabled={busy}
              onChange={() => setTravel(km)}
            />
            <span>{km} km</span>
          </label>
        ))}
        <p className="note">
          Vi bruker omtrentlig luftlinjeavstand mellom postområder, ikke
          kjørelengde. Du må ha postnummer i profilen din for å bli funnet etter
          avstand.
        </p>
      </fieldset>
      {selected
        .filter((area) => !contributionAreas.some((choice) => choice === area))
        .map((area) => (
          <label className="choice" key={area}>
            <input
              type="checkbox"
              checked
              disabled={busy}
              onChange={() =>
                setSelected(selected.filter((item) => item !== area))
              }
            />
            <span>
              {area} (tidligere valg – fjern og velg gjerne mer konkret)
            </span>
          </label>
        ))}
      <p className="note">
        Alle med fullført profil er synlige i hjelperlisten. Andre innloggede
        brukere i byen din kan se navnet ditt, byen, oppgavene du kan hjelpe
        med, profilbildet og vurderingene dine, og sende deg forespørsler.
        Adresse og telefon deles ikke automatisk.
      </p>
      {error && (
        <p className="account-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          type="button"
          className="text-button"
          disabled={busy}
          onClick={onClose}
        >
          Avbryt
        </button>
        <button className="button primary" disabled={busy}>
          {busy ? "Lagrer …" : "Lagre og avslutt"}
        </button>
      </div>
    </form>
  );
}
