"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAccount } from "./account";
import { useCity } from "./city-profile";
import type { NetworkMember } from "./network-tasks";
import Link from "next/link";

type Appointment = {
  id: string;
  title: string;
  starts_at: string;
  meeting_place: string;
  status: "pending" | "confirmed" | "cancelled";
  proposer_id: string;
  partner_id: string;
  helper_id: string;
  other_id: string;
  other_name: string;
  other_phone: string | null;
  shares_phone: boolean;
  current_friend: boolean;
};

export default function Appointments() {
  const { user } = useAccount();
  const { profile } = useCity();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [friends, setFriends] = useState<NetworkMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [create, setCreate] = useState(false);
  const [sharePhone, setSharePhone] = useState(false);
  const [acceptSharing, setAcceptSharing] = useState<Record<string, boolean>>(
    {},
  );
  const [showHistory, setShowHistory] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const supabase = createSupabaseClient();
        const [list, network] = await Promise.all([
          supabase.rpc("my_appointments"),
          supabase.rpc("network_members"),
        ]);
        if (list.error || network.error) throw list.error ?? network.error;
        if (active) {
          setAppointments(list.data ?? []);
          setFriends(network.data ?? []);
          setNow(Date.now());
        }
      } catch {
        if (active)
          setError("Kunne ikke hente avtalene og vennene dine. Prøv igjen.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision]);

  async function act(
    rpc: string,
    args: Record<string, string | boolean>,
    success: string,
  ) {
    if (busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const { error } = await createSupabaseClient().rpc(rpc, args);
      if (error) throw error;
      setMessage(success);
      setRevision((value) => value + 1);
      return true;
    } catch {
      setError(
        "Kunne ikke lagre endringen. Sjekk at tidspunktet er frem i tid og at dere fortsatt er venner. Prøv igjen.",
      );
      return false;
    } finally {
      setBusy(false);
    }
  }

  const upcoming = appointments
    .filter(
      (item) => item.status !== "cancelled" && Date.parse(item.starts_at) > now,
    )
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at));
  const history = appointments.filter((item) => !upcoming.includes(item));
  function card(item: Appointment) {
    const givesHelp = item.helper_id === user?.id;
    const confirmed = item.status === "confirmed";
    const telephone = item.other_phone?.replace(/[\s().-]/g, "");
    const callable = telephone && /^\+?\d{5,15}$/.test(telephone);
    return (
      <article className="appointment-display" key={item.id}>
        <span className="appointment-role">
          {item.status === "cancelled"
            ? "Avlyst"
            : confirmed
              ? givesHelp
                ? "Jeg skal hjelpe"
                : "Jeg får hjelp"
              : "Forslag til avtale"}
        </span>
        <p className="appointment-time">
          {new Date(item.starts_at).toLocaleString("nb-NO", {
            timeZone: "Europe/Oslo",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <h3>{item.title}</h3>
        <p>Med {item.other_name}</p>
        <p className="appointment-place">{item.meeting_place}</p>
        {!confirmed && item.status === "pending" && (
          <p className="note">
            {item.proposer_id === user?.id
              ? "Venter på at vennen din godtar forslaget."
              : givesHelp
                ? "Du er foreslått som hjelper. Godta for å bekrefte avtalen."
                : "Vennen din har foreslått å hjelpe deg. Godta for å bekrefte avtalen."}
          </p>
        )}
        {confirmed && callable ? (
          <a
            className="button outline appointment-call"
            href={`tel:${telephone}`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m7 3 3 5-3 3c2 3 3 4 6 6l3-3 5 3c0 3-2 5-5 4C8 19 5 16 3 8c-1-3 1-5 4-5Z" />
            </svg>
            Ring {item.other_name}
          </a>
        ) : (
          confirmed && (
            <p className="note">
              {item.current_friend
                ? "Telefonnummer er ikke delt eller kan ikke ringes. Avtal kontakt direkte med vennen din."
                : "Dere er ikke lenger venner i appen. Telefonnummeret vises ikke."}
            </p>
          )
        )}
        {item.status !== "cancelled" && (
          <div className="appointment-controls">
            {item.status === "pending" &&
              item.partner_id === user?.id &&
              Date.parse(item.starts_at) > now &&
              item.current_friend && (
                <>
                  {profile.phone && (
                    <label className="profile-checkbox">
                      <input
                        type="checkbox"
                        checked={acceptSharing[item.id] ?? false}
                        onChange={(event) =>
                          setAcceptSharing({
                            ...acceptSharing,
                            [item.id]: event.target.checked,
                          })
                        }
                        disabled={busy}
                      />
                      <span>Del mitt telefonnummer for denne avtalen</span>
                    </label>
                  )}
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        "answer_appointment",
                        {
                          target: item.id,
                          accept: true,
                          share_phone: Boolean(acceptSharing[item.id]),
                        },
                        "Avtalen er bekreftet og synlig for dere begge.",
                      )
                    }
                  >
                    Godta avtale
                  </button>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        "answer_appointment",
                        { target: item.id, accept: false },
                        "Forslaget er avslått.",
                      )
                    }
                  >
                    Avslå forslag
                  </button>
                </>
              )}
            {item.shares_phone && (
              <button
                className="text-button"
                disabled={busy}
                onClick={() =>
                  void act(
                    "appointment_phone_consent",
                    { target: item.id, share_phone: false },
                    "Deling av telefonnummer er slått av.",
                  )
                }
              >
                Stopp deling av mitt telefonnummer
              </button>
            )}
            {confirmed &&
              !item.shares_phone &&
              profile.phone &&
              item.current_friend && (
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    void act(
                      "appointment_phone_consent",
                      { target: item.id, share_phone: true },
                      "Telefonnummeret ditt er nå delt for denne avtalen.",
                    )
                  }
                >
                  Del mitt telefonnummer for denne avtalen
                </button>
              )}
            <button
              className="text-button"
              disabled={busy}
              onClick={() => {
                if (window.confirm("Vil du avlyse avtalen for dere begge?"))
                  void act(
                    "cancel_appointment",
                    { target: item.id },
                    "Avtalen er avlyst for dere begge.",
                  );
              }}
            >
              Avlys avtale
            </button>
          </div>
        )}
      </article>
    );
  }

  return (
    <section aria-label="Avtaler med venner">
      <div className="appointments-toolbar">
        <button
          className="button outline"
          disabled={busy || loading}
          onClick={() => setCreate(!create)}
        >
          {create ? "Lukk nytt forslag" : "Lag en avtale med en venn"}
        </button>
        <button
          className="text-button"
          disabled={busy || loading}
          onClick={() => setRevision((value) => value + 1)}
        >
          Oppdater
        </button>
      </div>
      {create && (
        <form
          className="account-form appointment-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fields = new FormData(form);
            const start = new Date(String(fields.get("starts")));
            if (
              !Number.isFinite(start.getTime()) ||
              start.getTime() <= Date.now()
            ) {
              setError("Velg en dato og et tidspunkt frem i tid.");
              return;
            }
            if (
              await act(
                "propose_appointment",
                {
                  friend: String(fields.get("friend")),
                  help_direction: String(fields.get("direction")),
                  appointment_title: String(fields.get("title")).trim(),
                  start_time: start.toISOString(),
                  place: String(fields.get("place")).trim(),
                  share_phone: sharePhone,
                },
                "Avtaleforslaget er sendt. Vennen din må godta før det er bekreftet.",
              )
            ) {
              form.reset();
              setSharePhone(false);
              setCreate(false);
            }
          }}
        >
          <h3>Ny avtale</h3>
          {!friends.length && (
            <p>
              Legg til en venn først under{" "}
              <Link href="/design?view=friends">Mine venner</Link>.
            </p>
          )}
          <label htmlFor="appointment-friend">Venn</label>
          <select
            id="appointment-friend"
            name="friend"
            required
            disabled={busy}
          >
            <option value="">Velg en venn</option>
            {friends.map((friend) => (
              <option key={friend.member_id} value={friend.member_id}>
                {friend.full_name} · {friend.city}
              </option>
            ))}
          </select>
          <label htmlFor="appointment-direction">Hvem skal hjelpe?</label>
          <select id="appointment-direction" name="direction" disabled={busy}>
            <option value="give">Jeg skal hjelpe</option>
            <option value="receive">Jeg skal få hjelp</option>
          </select>
          <label htmlFor="appointment-title">Hva skal dere gjøre?</label>
          <input
            id="appointment-title"
            name="title"
            maxLength={150}
            placeholder="For eksempel en tur i nabolaget"
            required
            disabled={busy}
          />
          <label htmlFor="appointment-starts">Dato og klokkeslett</label>
          <input
            id="appointment-starts"
            name="starts"
            type="datetime-local"
            required
            disabled={busy}
          />
          <p className="note">
            Skriv tidspunktet i din lokale tidssone. Kortene viser norsk tid.
          </p>
          <label htmlFor="appointment-place">Hvor skal dere møtes?</label>
          <input
            id="appointment-place"
            name="place"
            maxLength={300}
            placeholder="For eksempel ved bibliotekets hovedinngang"
            required
            disabled={busy}
          />
          <p className="note">
            Møtested deles med den valgte vennen. Ikke legg inn sensitive
            opplysninger. Profiladressen din deles ikke automatisk.
          </p>
          {profile.phone ? (
            <label className="profile-checkbox">
              <input
                type="checkbox"
                checked={sharePhone}
                onChange={(event) => setSharePhone(event.target.checked)}
                disabled={busy}
              />
              <span>Del mitt telefonnummer når avtalen er bekreftet</span>
            </label>
          ) : (
            <p className="note">
              Du kan legge til telefonnummer under Min profil for å tilby
              kontakt på telefon.
            </p>
          )}
          <button className="button primary" disabled={busy || !friends.length}>
            {busy ? "Sender …" : "Send avtaleforslag"}
          </button>
        </form>
      )}
      {loading && <p role="status">Henter avtaler …</p>}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
      {!loading && !error && !upcoming.length && (
        <p className="note">
          Ingen kommende avtaler. Lag et forslag med en venn for å komme i gang.
        </p>
      )}
      <div className="appointment-list">{upcoming.map(card)}</div>
      {history.length > 0 && (
        <details
          open={showHistory}
          onToggle={(event) => setShowHistory(event.currentTarget.open)}
        >
          <summary>Tidligere og avlyste avtaler</summary>
          <div className="appointment-list">{history.map(card)}</div>
        </details>
      )}
    </section>
  );
}
