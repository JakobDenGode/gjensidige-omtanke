"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAccount } from "./account";
import { useCity } from "./city-profile";
import type { NetworkMember } from "./network-tasks";
import { Avatar } from "./profile-photo";

type Connection = {
  id: string;
  user_id: string;
  friend_id: string;
  user_name: string;
  friend_name: string;
};

export default function Connections() {
  const { user } = useAccount();
  const { profile } = useCity();
  const [connections, setConnections] = useState<Connection[]>([]);
  const name = profile.full_name;
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [code, setCode] = useState("");
  const [invitation, setInvitation] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  const [removing, setRemoving] = useState<string | null>(null);
  const [screen, setScreen] = useState<"list" | "invite" | "profiles">("list");
  const [selectedId, setSelectedId] = useState("");
  const selectedMember = members.find(member => member.member_id === selectedId);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const supabase = createSupabaseClient();
        const { data: network, error: networkError } =
          await supabase.rpc("network_members");
        if (networkError) throw networkError;
        const { data, error } = await supabase
          .from("user_friends")
          .select("id,user_id,friend_id,user_name,friend_name")
          .order("created_at");
        if (error) throw error;
        if (active) {
          setConnections(data as Connection[]);
          setMembers(network ?? []);
        }
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
      {screen === "list" && <><p>Disse vennene kan se det du har delt med dem.</p>
      <div className="friend-main-actions"><button className="button" disabled={busy} onClick={() => setScreen("invite")}><FriendIcon />Legg til venn</button></div></>}
      {screen !== "list" && <button className="text-button" disabled={busy} onClick={() => { setScreen("list"); setRemoving(null); }}>Tilbake til mine venner</button>}
      {screen === "profiles" && <div className="friend-profile-view"><div className="friend-profile-banner"><p>Du ser bare opplysninger som er delt med deg.</p><div className="friend-profile-switcher" role="group" aria-label="Velg venn">{members.map(member => <button className="button outline" key={member.member_id} aria-pressed={selectedId === member.member_id} onClick={() => setSelectedId(member.member_id)}>{member.full_name}</button>)}</div></div>{selectedMember && <><div className="friend-person"><Avatar userId={selectedMember.member_id} name={selectedMember.full_name} /><h3>Profilen til {selectedMember.full_name}</h3></div><p>{selectedMember.city}</p><section className="friend-shared-panel"><h3>Kan bidra med</h3><p>{selectedMember.can_help.join(", ") || "Ikke oppgitt"}</p><h3>Ønsker hjelp til</h3><p>{selectedMember.needs_help.join(", ") || "Ikke oppgitt"}</p></section></>}<p className="privacy">Du har ikke tilgang til vennens private avtaler, adresse, telefon eller helseopplysninger. Du kan ikke opprette forespørsler på vegne av vennen din.</p></div>}
      {screen === "invite" && <><p className="privacy">
        Venner ser navnet ditt, byen din og hvilke oppgaver du kan hjelpe med
        eller trenger hjelp til. De ser bare forespørsler du velger å sende til
        dem. Adresse, telefon og helseopplysninger deles ikke automatisk.
      </p>
      <p>
        Du inviterer som <strong>{name}</strong>. Navnet hentes fra profilen
        din. Del bare koden med personen du ønsker å legge til; navn og e-post
        er ikke identitetsverifisert.
      </p>
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
              setInvitation("");
              setMessage(
                "Invitasjonen er godtatt. Dere finner nå hverandre i vennelisten.",
              );
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
      </>}
      {busy && <p role="status">Vennligst vent …</p>}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
      {screen === "list" && <>
      <button
        className="text-button"
        disabled={busy || loading}
        onClick={() => setRevision((value) => value + 1)}
      >
        Oppdater listen
      </button>
      {loading && <p role="status">Henter vennelisten …</p>}
      {!loading && !error && !connections.length && (
        <p>
          Vennelisten din er tom. Inviter en venn eller godta en invitasjon for
          å komme i gang.
        </p>
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
            const member = members.find(
              (item) =>
                item.member_id ===
                (isUser ? connection.friend_id : connection.user_id),
            );
            const otherName =
              member?.full_name ||
              (isUser ? connection.friend_name : connection.user_name);
            return (
              <article className="friend-display-card" key={connection.id}>
                <div className="friend-person">
                <Avatar
                  userId={isUser ? connection.friend_id : connection.user_id}
                  name={otherName}
                />
                <h3>{otherName}</h3>
                </div>
                {member && <p>{member.city}</p>}
                <span className="tag">Har tilgang til delte opplysninger</span>
                <p className="friend-access-line"><FriendIcon />Kan se navn, by og oppgaveønsker</p>
                <button className="friend-view-link" disabled={!member} onClick={() => { setSelectedId(member?.member_id ?? ""); setScreen("profiles"); }}>Se tilgang <span aria-hidden="true">→</span></button>
                {removing === connection.id ? (
                  <>
                    <p>
                      Vil du fjerne {otherName} fra vennelisten? Dere blir
                      fjernet fra hverandres vennelister. Dere mister også
                      tilgang til forespørsler dere har delt med hverandre.
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
                          setMessage(
                            `${otherName} er fjernet fra vennelisten.`,
                          );
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
      <details className="friend-privacy-details"><summary>Hva deles med vennene mine?</summary><p className="note">Venner ser navn, by og oppgavepreferanser, og bare forespørslene du velger å sende til dem. Private avtaler og helseopplysninger deles ikke automatisk.</p></details>
      </>}
    </section>
  );
}

function FriendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0" /></svg>;
}
