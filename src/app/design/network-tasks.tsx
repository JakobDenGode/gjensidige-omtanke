"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";

export type NetworkMember = {
  member_id: string;
  full_name: string;
  city: string;
  can_help: string[];
  needs_help: string[];
};

export function NetworkRecipients({
  category,
  selected,
  onChange,
  disabled,
}: {
  category: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled: boolean;
}) {
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const { data, error } =
          await createSupabaseClient().rpc("network_members");
        if (error) throw error;
        if (active) setMembers(data ?? []);
      } catch {
        if (active)
          setError(
            "Kunne ikke hente venner. Prøv igjen før du velger mottakere.",
          );
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision]);
  return (
    <fieldset className="choices">
      <legend>Hvem vil du spørre?</legend>
      <p className="note">
        Velg én eller flere venner. De får se oppgaven, beskrivelsen, navnet og
        byen din. Adresse og telefon deles ikke automatisk. Uten mottakere
        lagres forespørselen bare for deg.
      </p>
      {loading && <p role="status">Henter venner …</p>}
      {error && (
        <>
          <p role="alert" className="account-error">
            {error}
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Prøv igjen
          </button>
        </>
      )}
      {!loading && !error && !members.length && (
        <p>Legg til venner under Mine venner for å spørre nettverket ditt.</p>
      )}
      {members.map((member) => (
        <label className="choice" key={member.member_id}>
          <input
            type="checkbox"
            disabled={disabled || loading}
            checked={selected.includes(member.member_id)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...selected, member.member_id]
                  : selected.filter((id) => id !== member.member_id),
              )
            }
          />
          <span>
            {member.full_name || "Venn uten fullført profil"} · {member.city}
            {member.can_help.includes(category) && (
              <small>Har sagt at de kan hjelpe med dette</small>
            )}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

type InboxItem = {
  request_id: string;
  owner_name: string;
  city: string;
  task: string;
  category: string;
  timing: string;
  description: string;
  status: string;
  response: string;
};
type Reply = {
  request_id: string;
  task: string;
  status: string;
  friend_name: string;
  response: string;
};
const responseLabels: Record<string, string> = {
  pending: "Venter på svar",
  accepted: "Kan hjelpe",
  declined: "Kan ikke hjelpe",
};

export default function NetworkTasks() {
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const supabase = createSupabaseClient();
        const [incoming, outgoing] = await Promise.all([
          supabase.rpc("network_request_inbox"),
          supabase.rpc("network_request_responses"),
        ]);
        if (incoming.error || outgoing.error)
          throw incoming.error ?? outgoing.error;
        if (active) {
          setInbox(incoming.data ?? []);
          setReplies(outgoing.data ?? []);
        }
      } catch {
        if (active)
          setError("Kunne ikke hente forespørsler fra nettverket. Prøv igjen.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [revision]);

  return (
    <section className="network-tasks" aria-labelledby="network-tasks-title">
      <h3 id="network-tasks-title">Forespørsler fra venner</h3>
      <button
        className="text-button"
        disabled={loading || busy}
        onClick={() => setRevision((value) => value + 1)}
      >
        Oppdater nettverket
      </button>
      {loading && <p role="status">Henter nettverket …</p>}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <p role="status">{message}</p>
      {!loading && !error && !inbox.length && (
        <p>Ingen venner har sendt deg en forespørsel ennå.</p>
      )}
      <div className="request-list">
        {inbox.map((item) => (
          <article className="request-record" key={item.request_id}>
            <h3>{item.task}</h3>
            <p>
              Fra {item.owner_name} · {item.city} · {item.timing}
            </p>
            <p className="request-description">{item.description}</p>
            <span className="tag">
              {item.status === "cancelled"
                ? "Avbrutt"
                : responseLabels[item.response]}
            </span>
            {item.status === "open" && (
              <div className="voice-controls">
                {(["accepted", "declined"] as const).map((answer) => (
                  <button
                    key={answer}
                    className="button outline"
                    disabled={busy || item.response === answer}
                    onClick={async () => {
                      setBusy(true);
                      setError("");
                      setMessage("");
                      try {
                        const { error } = await createSupabaseClient().rpc(
                          "respond_to_network_request",
                          { target: item.request_id, answer },
                        );
                        if (error) throw error;
                        setMessage(
                          "Svaret ditt er lagret. Avtal tid og sted med vennen din utenfor appen.",
                        );
                        setRevision((value) => value + 1);
                      } catch {
                        setError(
                          "Kunne ikke lagre svaret. Forespørselen kan være avbrutt eller vennskapet fjernet.",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    {answer === "accepted"
                      ? "Jeg kan hjelpe"
                      : "Kan ikke denne gangen"}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
      <h3 className="example-section-title">Svar på dine forespørsler</h3>
      <p className="note">
        Et ja er et tilbud om hjelp, ikke en ferdig avtale. Avtal tid og sted
        direkte. Oppgaver tildeles ikke automatisk.
      </p>
      <div className="request-list">
        {Object.entries(
          Object.groupBy(replies, (reply) => reply.request_id),
        ).map(([id, responses]) => (
          <div className="request-record" key={id}>
            <h3>
              {responses?.[0].task}
              {responses?.[0].status === "cancelled" ? " · Avbrutt" : ""}
            </h3>
            {responses?.map((reply, index) => (
              <p key={index}>
                {reply.friend_name}: {responseLabels[reply.response]}
              </p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
