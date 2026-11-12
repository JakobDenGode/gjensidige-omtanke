"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
type Member = {
  household_name: string;
  owner_id: string;
  member_id: string;
  full_name: string;
  can_help: string[];
  needs_help: string[];
};
export default function Household({ userId }: { userId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [revision, setRevision] = useState(0);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [invite, setInvite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void createSupabaseClient()
      .rpc("my_household")
      .then(({ data, error }) => {
        if (active) {
          if (error) setError("Kunne ikke hente husstanden.");
          else setMembers(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [revision]);
  async function action(rpc: string, args: Record<string, string> = {}) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { data, error } = await createSupabaseClient().rpc(rpc, args);
      if (error) throw error;
      if (rpc === "invite_household_member") setInvite(data);
      else setInvite("");
      setRevision((v) => v + 1);
    } catch {
      setError(
        "Kunne ikke fullføre. Kontroller invitasjonskoden og prøv igjen.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="request-record">
      <h2>Min husstand</h2>
      <p className="note">
        Medlemmer deler navn og oppgavepreferanser. Adresse, forsikring og
        forespørsler deles ikke. Hver person bruker sin egen konto og redigerer
        egne valg.
      </p>
      {loading ? (
        <p role="status">Henter husstand …</p>
      ) : members.length ? (
        <>
          <h3>{members[0].household_name}</h3>
          {members.map((m) => (
            <div key={m.member_id}>
              <h3>{m.full_name}</h3>
              <p>Kan bidra: {m.can_help.join(", ") || "Ikke oppgitt"}</p>
              <p>Ønsker hjelp: {m.needs_help.join(", ") || "Ikke oppgitt"}</p>
              {(m.member_id === userId || members[0].owner_id === userId) && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        m.member_id === members[0].owner_id
                          ? "Slette husstanden for alle medlemmer?"
                          : "Fjerne medlemmet fra husstanden?",
                      )
                    )
                      void action("remove_household_member", {
                        target: m.member_id,
                      });
                  }}
                >
                  {" "}
                  {m.member_id === members[0].owner_id
                    ? "Slett husstand"
                    : m.member_id === userId
                      ? "Forlat husstand"
                      : "Fjern medlem"}
                </button>
              )}
            </div>
          ))}
          {members[0].owner_id === userId && (
            <>
              <button
                type="button"
                className="button outline"
                disabled={busy}
                onClick={() => void action("invite_household_member")}
              >
                Inviter husstandsmedlem
              </button>
              {invite && (
                <>
                  <label htmlFor="household-invite">Del koden privat</label>
                  <textarea id="household-invite" readOnly value={invite} />
                </>
              )}
              <p className="note">
                Én bruk, gyldig i sju dager. Ny kode erstatter den forrige.
              </p>
              <button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={() => void action("revoke_household_invitation")}
              >
                Trekk tilbake invitasjon
              </button>
            </>
          )}
        </>
      ) : (
        <>
          <label htmlFor="household-name">Navn på husstanden</label>
          <input
            id="household-name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
          <button
            type="button"
            className="button outline"
            disabled={busy || !name.trim()}
            onClick={() =>
              void action("create_household", { household_name: name.trim() })
            }
          >
            Opprett husstand
          </button>
          <label htmlFor="household-code">
            Invitasjonskode fra et husstandsmedlem
          </label>
          <textarea
            id="household-code"
            value={code}
            maxLength={64}
            onChange={(e) => setCode(e.target.value)}
          />
          <button
            type="button"
            className="button outline"
            disabled={busy || code.trim().length !== 64}
            onClick={() =>
              void action("accept_household_invitation", { code: code.trim() })
            }
          >
            Bli med i husstanden
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
    </section>
  );
}
