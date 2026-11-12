"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { useAccount } from "./account";
import { useCity } from "./city-profile";
import type { NetworkMember } from "./network-tasks";
import { Avatar } from "./profile-photo";
import FriendInvite from "./friend-invite";
import SharedFriend from "./shared-friend";
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
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [screen, setScreen] = useState<
    "list" | "invite" | "accept" | "profile"
  >("list");
  const [selected, setSelected] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const s = createSupabaseClient();
        const [network, list] = await Promise.all([
          s.rpc("network_members"),
          s
            .from("user_friends")
            .select("id,user_id,friend_id,user_name,friend_name")
            .order("created_at"),
        ]);
        if (network.error || list.error) throw Error();
        if (active) {
          setMembers(network.data ?? []);
          setConnections(list.data ?? []);
          setError("");
        }
      } catch {
        if (active) setError("Kunne ikke hente vennene dine. Prøv igjen.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision]);
  const member = members.find((m) => m.member_id === selected);
  return (
    <section className="connections-panel" aria-label="Mine venner">
      {screen !== "list" && (
        <button
          className="text-button"
          disabled={busy}
          onClick={() => setScreen("list")}
        >
          Tilbake til mine venner
        </button>
      )}
      {screen === "invite" && (
        <FriendInvite onClose={() => setScreen("list")} />
      )}
      {screen === "accept" && (
        <form
          className="account-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            setError("");
            try {
              const { error } = await createSupabaseClient().rpc(
                "accept_friend_invitation",
                {
                  invitation_code: code.trim(),
                  display_name: profile.full_name,
                },
              );
              if (error) throw error;
              setCode("");
              setRevision((v) => v + 1);
              setScreen("list");
              setMessage("Invitasjonen er godtatt.");
            } catch {
              setError(
                "Invitasjonen kunne ikke godtas. Koden må være ubrukt, gyldig og tilhøre din e-postadresse dersom en adresse ble oppgitt.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <h3>Godta invitasjon</h3>
          <label htmlFor="connection-code">Invitasjonskode</label>
          <textarea
            id="connection-code"
            value={code}
            maxLength={64}
            required
            disabled={busy}
            onChange={(e) => setCode(e.target.value)}
          />
          <p className="note">
            Ved å godta kobles kontoene sammen. Bare tillatelsene den andre
            personen har valgt deles fra deres konto til deg. Det gir ikke
            motsatt tilgang til dine opplysninger.
          </p>
          <button
            className="button primary"
            disabled={busy || code.trim().length !== 64}
          >
            Godta invitasjon
          </button>
        </form>
      )}
      {screen === "profile" && member && (
        <>
          <div className="friend-person">
            <Avatar userId={member.member_id} name={member.full_name} />
            <h3>{member.full_name}</h3>
          </div>
          <p>{member.city}</p>
          <div className="friend-shared-panel">
            <h3>Kan bidra med</h3>
            <p>{member.can_help.join(", ") || "Ikke oppgitt"}</p>
            <h3>Ønsker hjelp til</h3>
            <p>{member.needs_help.join(", ") || "Ikke oppgitt"}</p>
          </div>
          <SharedFriend id={member.member_id} name={member.full_name} />
        </>
      )}
      {screen === "list" && (
        <>
          <p>Disse vennene kan se det du har delt med dem.</p>
          <div className="friend-main-actions">
            <button className="button" onClick={() => setScreen("invite")}>
              <FriendIcon />
              Legg til venn
            </button>
            <button className="text-button" onClick={() => setScreen("accept")}>
              Har du fått en invitasjon?
            </button>
          </div>
          <button
            className="text-button"
            disabled={loading}
            onClick={() => setRevision((v) => v + 1)}
          >
            Oppdater listen
          </button>
          {loading && <p role="status">Henter venner …</p>}
          {!loading && !connections.length && (
            <p>Vennelisten din er tom. Legg til en venn for å komme i gang.</p>
          )}
          <div className="friends-grid">
            {connections.map((c) => {
              const id = c.user_id === user?.id ? c.friend_id : c.user_id;
              const person = members.find((m) => m.member_id === id);
              const name =
                person?.full_name ||
                (c.user_id === user?.id ? c.friend_name : c.user_name);
              return (
                <article className="friend-display-card" key={c.id}>
                  <div className="friend-person">
                    <Avatar userId={id} name={name} />
                    <h3>{name}</h3>
                  </div>
                  <p>{person?.city}</p>
                  <span className="tag">
                    Har tilgang til delte opplysninger
                  </span>
                  <button
                    className="friend-view-link"
                    onClick={() => {
                      setSelected(id);
                      setScreen("profile");
                    }}
                  >
                    Se tilgang <span aria-hidden="true">→</span>
                  </button>
                  {c.user_id === user?.id && (
                    <button
                      className="text-button"
                      onClick={async () => {
                        const { error } = await createSupabaseClient().rpc(
                          "revoke_friend_permissions",
                          { connection: c.id },
                        );
                        if (error)
                          setError("Kunne ikke trekke tilbake delingen.");
                        else
                          setMessage(
                            "Ekstra deling er trukket tilbake. Vennskapet består.",
                          );
                      }}
                    >
                      Trekk tilbake ekstra deling
                    </button>
                  )}
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        !window.confirm(
                          `Fjerne ${name} fra vennelisten for dere begge?`,
                        )
                      )
                        return;
                      setBusy(true);
                      const { error } = await createSupabaseClient()
                        .from("user_friends")
                        .delete()
                        .eq("id", c.id)
                        .select("id")
                        .single();
                      if (error) setError("Kunne ikke fjerne vennen.");
                      else setRevision((v) => v + 1);
                      setBusy(false);
                    }}
                  >
                    Fjern fra vennelisten
                  </button>
                </article>
              );
            })}
          </div>
        </>
      )}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
function FriendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
    </svg>
  );
}
