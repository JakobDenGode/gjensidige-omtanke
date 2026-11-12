"use client";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
type Outcome = {
  request_id: string;
  task: string;
  status: string;
  helper_id: string;
  helper_name: string;
  reviewed: boolean;
};
export function HelperRating({ id }: { id: string }) {
  const [reviews, setReviews] = useState<
    {
      rating: number;
      review_count: number;
      comment: string;
      reviewer_name: string;
    }[]
  >([]);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let active = true;
    void createSupabaseClient()
      .rpc("helper_reputation", { target: id })
      .then(({ data, error }) => {
        if (active) {
          setReviews(data ?? []);
          setState(error ? "error" : "ready");
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  return (
    <div className="worker-specialty">
      {state === "loading" ? (
        <p>Henter vurderinger …</p>
      ) : state === "error" ? (
        <p>Vurderinger er ikke tilgjengelige akkurat nå.</p>
      ) : reviews.length ? (
        <>
          <p>
            {reviews[0].rating} av 5 · {reviews[0].review_count} vurderinger fra
            fullførte oppgaver
          </p>
          <details>
            <summary>Les vurderinger</summary>
            {reviews.map((r, i) => (
              <p key={i}>
                {r.reviewer_name}: {r.comment || "Ingen kommentar"}
              </p>
            ))}
          </details>
        </>
      ) : (
        <p>Ingen vurderinger ennå</p>
      )}
    </div>
  );
}
export default function TaskReviews() {
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void createSupabaseClient()
      .rpc("my_task_outcomes")
      .then(({ data, error }) => {
        if (active) {
          if (error) setError("Kunne ikke hente fullføringer.");
          else setOutcomes(data ?? []);
        }
      });
    return () => {
      active = false;
    };
  }, [revision]);
  async function act(rpc: string, args: Record<string, string | number>) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const { error } = await createSupabaseClient().rpc(rpc, args);
      if (error) throw error;
      setRevision((v) => v + 1);
    } catch {
      setError(
        "Kunne ikke lagre. Oppgaven må være åpen med en venn som har sagt ja, eller fullført før vurdering.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section>
      <h3 className="example-section-title">Fullføring og vurderinger</h3>
      <p className="note">
        Bekreft først når hjelpen faktisk er utført. Du kan vurdere den valgte
        hjelperen én gang per oppgave. Vurderingen vises til hjelperens venner;
        unngå sensitive detaljer.
      </p>
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
      <div className="request-list">
        {outcomes.map((o) => (
          <article
            className="request-record"
            key={`${o.request_id}-${o.helper_id}`}
          >
            <h3>{o.task}</h3>
            <p>Hjelper: {o.helper_name}</p>
            {o.status === "open" ? (
              <button
                type="button"
                className="button outline"
                disabled={busy}
                onClick={() => {
                  if (
                    window.confirm(
                      `Bekrefter du at ${o.helper_name} har utført oppgaven?`,
                    )
                  )
                    void act("complete_help_request", {
                      target: o.request_id,
                      helper: o.helper_id,
                    });
                }}
              >
                Bekreft utført hjelp
              </button>
            ) : o.reviewed ? (
              <span className="tag">Fullført og vurdert</span>
            ) : (
              <form
                className="account-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const values = new FormData(e.currentTarget);
                  void act("review_helper", {
                    target: o.request_id,
                    stars: Number(values.get("rating")),
                    review_text: String(values.get("comment")),
                  });
                }}
              >
                <label htmlFor={`rating-${o.request_id}`}>Vurdering</label>
                <select id={`rating-${o.request_id}`} name="rating" required>
                  <option value="">Velg</option>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n} av 5
                    </option>
                  ))}
                </select>
                <label htmlFor={`comment-${o.request_id}`}>
                  Kommentar (valgfritt)
                </label>
                <textarea
                  id={`comment-${o.request_id}`}
                  name="comment"
                  maxLength={500}
                />
                <button className="button primary" disabled={busy}>
                  Lagre vurdering
                </button>
              </form>
            )}
          </article>
        ))}
      </div>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => setRevision((v) => v + 1)}
      >
        Oppdater fullføringer
      </button>
    </section>
  );
}
