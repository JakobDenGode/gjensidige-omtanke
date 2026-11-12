"use client";

import { useState } from "react";
import { useCity } from "./city-profile";
import { createSupabaseClient } from "@/lib/supabase";
import { useAccount } from "./account";
import { taskAreas } from "@/lib/task-areas";

export default function Contributions({ onClose }: { onClose: () => void }) {
  const { profile, reloadProfile } = useCity();
  const { user } = useAccount();
  const [selected, setSelected] = useState(profile.can_help);
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
            .update({ can_help: selected })
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
          {taskAreas.map((area) => (
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
              <span>{area}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="note" role="status">
        {selected.length} aktiviteter valgt
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
