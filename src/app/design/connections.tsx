"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAccount } from "./account";

type Connection = {
  id: string;
  user_id: string;
  friend_id: string;
  user_name: string;
  friend_name: string;
};

export default function Connections() {
  const { user } = useAccount();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [invitation, setInvitation] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error } = await createSupabaseClient()
          .from("user_friends")
          .select("id,user_id,friend_id,user_name,friend_name")
          .order("created_at");
        if (error) throw error;
        if (active) setConnections(data as Connection[]);
      } catch {
        if (active)
          setError("Kunne ikke hente vennelisten. Prøv å oppdatere listen.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision, user?.id]);

  async function act(action: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch {
      setError(
        "Handlingen kunne ikke fullføres. Sjekk internettforbindelsen og prøv igjen. Invitasjonskoden må være gyldig, ubrukt og fra en annen konto.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="connections-panel" aria-label="Mine venner">
      <p>
        Du kan legge til flere venner. Du kan også være venn for andre brukere.
        Du velger selv hvem du inviterer.
      </p>
      <p className="privacy">
        Vennene dine får foreløpig ikke tilgang til forespørsler, avtaler eller
        helseopplysninger.
      </p>
      <label htmlFor="connection-name">
        Navnet ditt (vises til vennene dine)
      </label>
      <input
        id="connection-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        autoComplete="name"
        disabled={busy}
      />
      <div className="connection-forms">
        <form
          className="request-record"
          onSubmit={(event) => {
            event.preventDefault();
            void act(async () => {
              const { data, error } = await createSupabaseClient().rpc(
                "create_friend_invitation",
                { display_name: name.trim() },
              );
              if (error) throw error;
              setInvitation(data as string);
              setMessage("Invitasjonen er klar. Del koden privat med én venn.");
            });
          }}
        >
          <h2>Inviter en venn</h2>
          <p>Del en invitasjonskode med en du vil legge til som venn.</p>
          <button className="button primary" disabled={busy || !name.trim()}>
            Lag invitasjon
          </button>
          <p className="note">
            Koden kan brukes én gang og utløper etter sju dager. En ny kode
            erstatter den forrige. Lag en ny invitasjon for hver venn.
          </p>
          {invitation && (
            <>
              <label htmlFor="friend-invitation">
                Invitasjonskode – del privat
              </label>
              <textarea id="friend-invitation" readOnly value={invitation} />
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  void act(async () => {
                    await navigator.clipboard.writeText(invitation);
                    setMessage("Koden er kopiert.");
                  })
                }
                disabled={busy}
              >
                Kopier kode
              </button>
            </>
          )}
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                const { error } = await createSupabaseClient().rpc(
                  "revoke_friend_invitation",
                );
                if (error) throw error;
                setInvitation("");
                setMessage("Eventuell aktiv invitasjon er trukket tilbake.");
              })
            }
          >
            Trekk tilbake aktiv invitasjon
          </button>
        </form>
        <form
          className="request-record"
          onSubmit={(event) => {
            event.preventDefault();
            void act(async () => {
              const { error } = await createSupabaseClient().rpc(
                "accept_friend_invitation",
                { invitation_code: code.trim(), display_name: name.trim() },
              );
              if (error) throw error;
              setCode("");
              setMessage("Invitasjonen er godtatt. Dere finner nå hverandre i vennelisten.");
              setRevision((value) => value + 1);
            });
          }}
        >
          <h2>Har du fått en invitasjon?</h2>
          <p>Bruk en invitasjon du har fått fra en bruker.</p>
          <label htmlFor="connection-code">Invitasjonskode</label>
          <textarea
            id="connection-code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={64}
            required
            disabled={busy}
            autoCapitalize="none"
            spellCheck={false}
          />
          <button
            className="button primary"
            disabled={busy || !name.trim() || code.trim().length !== 64}
          >
            Godta invitasjon
          </button>
        </form>
      </div>
      {busy && <p role="status">Vennligst vent …</p>}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
      <h2>Vennelisten din</h2>
      <button
        className="text-button"
        disabled={busy || loading}
        onClick={() => setRevision((value) => value + 1)}
      >
        Oppdater listen
      </button>
      {loading && <p role="status">Henter vennelisten …</p>}
      {!loading && !error && !connections.length && (
        <p>Vennelisten din er tom. Inviter en venn eller godta en invitasjon for å komme i gang.</p>
      )}
      <div className="friends-grid">
        {connections
          .filter(
            (connection) =>
              connection.user_id === user?.id ||
              connection.friend_id === user?.id,
          )
          .map((connection) => {
            const isUser = connection.user_id === user?.id;
            const otherName = isUser
              ? connection.friend_name
              : connection.user_name;
            return (
              <article className="request-record" key={connection.id}>
                <h3>{otherName}</h3>
                <span className="tag">{isUser ? "Venn" : "Bruker"}</span>
                <p>
                  {isUser
                    ? `${otherName} er lagt til som venn hos deg.`
                    : `Du er lagt til som venn hos ${otherName}.`}
                </p>
                {removing === connection.id ? (
                  <>
                    <p>
                      Vil du fjerne {otherName} fra vennelisten? Dere blir fjernet fra hverandres vennelister.
                    </p>
                    <button
                      className="button danger"
                      disabled={busy}
                      onClick={() =>
                        void act(async () => {
                          const { error } = await createSupabaseClient()
                            .from("user_friends")
                            .delete()
                            .eq("id", connection.id)
                            .select("id")
                            .single();
                          if (error) throw error;
                          setRemoving(null);
                          setRevision((value) => value + 1);
                          setMessage(`${otherName} er fjernet fra vennelisten.`);
                        })
                      }
                    >
                      Ja, fjern fra vennelisten
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => setRemoving(null)}
                    >
                      Behold i vennelisten
                    </button>
                  </>
                ) : (
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => setRemoving(connection.id)}
                  >
                    Fjern fra vennelisten
                  </button>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
}
