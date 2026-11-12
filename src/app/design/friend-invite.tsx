"use client";
import { useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export default function FriendInvite({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  return (
    <form
      className="friend-invite-form account-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const values = new FormData(e.currentTarget);
        setBusy(true);
        setError("");
        try {
          const { data, error } = await createSupabaseClient().rpc(
            "create_friend_invitation_with_permissions",
            {
              contact_name: String(values.get("name")).trim(),
              contact_phone: String(values.get("phone")).trim(),
              contact_email: String(values.get("email")).trim(),
              share_appointments: values.has("appointments"),
              share_weather: values.has("weather"),
              share_requests: values.has("requests"),
            },
          );
          if (error) throw error;
          setCode(data);
        } catch {
          setError(
            "Kunne ikke opprette invitasjonen. Sjekk opplysningene og prøv igjen.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Legg til venn</h3>
      <label htmlFor="invite-name">Navn</label>
      <input
        id="invite-name"
        name="name"
        maxLength={80}
        required
        disabled={busy}
      />
      <label htmlFor="invite-phone">Telefonnummer</label>
      <input
        id="invite-phone"
        name="phone"
        type="tel"
        minLength={5}
        maxLength={30}
        required
        disabled={busy}
      />
      <label htmlFor="invite-email">E-post (valgfritt)</label>
      <input
        id="invite-email"
        name="email"
        type="email"
        maxLength={254}
        disabled={busy}
      />
      <fieldset className="choices">
        <legend>Hva vil du dele?</legend>
        {[
          ["appointments", "Se hverdagsavtaler"],
          ["weather", "Se værvarsler for byen min"],
          ["requests", "Se og lage forespørsler"],
        ].map(([value, label]) => (
          <label className="choice" key={value}>
            <input type="checkbox" name={value} disabled={busy} />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      <p className="note">
        Tilgang gis først når vennen godtar koden. Avtaledeling inkluderer
        møtested. Adresser, helseopplysninger og forsikring deles ikke. E-post
        binder invitasjonen til kontoen med samme adresse, men e-post er ikke
        verifisert i demoen. Telefon brukes ikke til identitetskontroll.
      </p>
      {code && (
        <section className="request-record">
          <h3>Invitasjonen er klar</h3>
          <label htmlFor="invite-generated-code">
            Del koden privat med vennen din
          </label>
          <textarea id="invite-generated-code" readOnly value={code} />
          <p className="note">
            Ingen SMS eller e-post er sendt. Koden kan brukes én gang innen sju
            dager. En ny invitasjon erstatter den forrige.
          </p>
          <button
            type="button"
            className="text-button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
              } catch {
                setError(
                  "Kunne ikke kopiere. Marker koden og kopier den manuelt.",
                );
              }
            }}
          >
            Kopier kode
          </button>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              const { error } = await createSupabaseClient().rpc(
                "revoke_friend_invitation",
              );
              if (error) setError("Kunne ikke trekke tilbake invitasjonen.");
              else setCode("");
              setBusy(false);
            }}
          >
            Trekk tilbake invitasjon
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="text-button"
          type="button"
          disabled={busy}
          onClick={onClose}
        >
          Avbryt
        </button>
        <button className="button" disabled={busy}>
          {busy ? "Lagrer …" : "Neste"}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </form>
  );
}
