"use client";

import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import {
  winterTasks,
  timeChoices,
  osloDate,
  dateLabel,
} from "@/lib/winter-tasks";
import { useAccount } from "./account";
import type { NetworkMember } from "./network-tasks";
import { HelperRating } from "./task-reviews";
import { Avatar } from "./profile-photo";
import WinterTaskIcon from "./winter-task-icon";

export default function WinterRequest({
  onClose,
  onSaved,
  onStep,
  onBusy,
}: {
  onClose: () => void;
  onSaved: () => void;
  onStep: (step: number) => void;
  onBusy: (busy: boolean) => void;
}) {
  const { saveRequest } = useAccount();
  const [step, setStep] = useState(1);
  const [tasks, setTasks] = useState<string[]>([]);
  const [members, setMembers] = useState<NetworkMember[]>([]);
  const [helper, setHelper] = useState("");
  const [dates, setDates] = useState<string[]>([]);
  const [time, setTime] = useState("Fleksibel");
  const [today] = useState(() => osloDate());
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
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

  function changeStep(next: number) {
    setStep(next);
    onStep(next);
    setError("");
  }
  const selectedHelper = members.find((member) => member.member_id === helper);
  const [year, monthNumber] = month.split("-").map(Number);
  const offset =
    (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const lastDate = new Date(`${today}T12:00:00Z`);
  lastDate.setUTCDate(lastDate.getUTCDate() + 365);
  const latest = lastDate.toISOString().slice(0, 10);
  function moveMonth(direction: number) {
    const value = new Date(Date.UTC(year, monthNumber - 1 + direction, 1));
    setMonth(value.toISOString().slice(0, 7));
  }

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        if (step === 1 && !tasks.length) {
          setError("Velg minst én oppgave.");
          return;
        }
        if (step === 2 && !selectedHelper) {
          setError("Velg en venn som kan hjelpe deg.");
          return;
        }
        if (
          step === 3 &&
          (!dates.length || dates.some((date) => date < osloDate()))
        ) {
          setError("Velg minst én dato som ikke har passert.");
          return;
        }
        if (step < 4) {
          changeStep(step + 1);
          return;
        }
        setBusy(true);
        onBusy(true);
        setError("");
        try {
          await saveRequest(
            {
              kind: "request",
              category: "Snømåking",
              task: tasks[0],
              timing: "Jeg er fleksibel",
              description: "",
              tasks,
              preferred_dates: dates,
              time_of_day: time,
            },
            [helper],
          );
          onSaved();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : "Kunne ikke sende forespørselen.",
          );
        } finally {
          setBusy(false);
          onBusy(false);
        }
      }}
    >
      {step === 1 && (
        <>
          <p>Velg én eller flere oppgaver.</p>
          <fieldset className="choices winter-options">
            <legend className="sr-only">Måkeoppgaver</legend>
            {winterTasks.map((task) => (
              <label className="choice" key={task}>
                <input
                  type="checkbox"
                  checked={tasks.includes(task)}
                  onChange={(event) =>
                    setTasks(
                      event.target.checked
                        ? [...tasks, task]
                        : tasks.filter((item) => item !== task),
                    )
                  }
                />
                <WinterTaskIcon task={task} />
                <span>{task}</span>
              </label>
            ))}
          </fieldset>
          <p className="note" role="status">
            {tasks.length} {tasks.length === 1 ? "oppgave" : "oppgaver"} valgt
          </p>
        </>
      )}
      {step === 2 && (
        <>
          <p>
            Velg noen i nettverket ditt. Et ja til forespørselen er ikke en
            ferdig avtale.
          </p>
          {loading && <p role="status">Henter venner …</p>}
          {!loading && !members.length && (
            <p className="privacy">
              Du har ingen venner i nettverket ennå. Legg til en venn under Mine
              venner først.
            </p>
          )}
          <fieldset className="worker-list">
            <legend className="sr-only">Velg hjelper</legend>
            {members.map((member) => (
              <div key={member.member_id}>
                <label className="worker-card">
                  <span className="worker-heading">
                    <Avatar userId={member.member_id} name={member.full_name} />
                    <span className="worker-info">
                      <span className="worker-name">
                        {member.full_name || "Venn uten navn"}
                      </span>
                      <span>{member.city}</span>
                    </span>
                    <input
                      type="radio"
                      name="winter-worker"
                      value={member.member_id}
                      checked={helper === member.member_id}
                      onChange={() => setHelper(member.member_id)}
                      aria-label={`Velg ${member.full_name || "venn"}`}
                    />
                  </span>
                  <span className="worker-specialty">
                    {member.can_help.includes("Snømåking")
                      ? "Har sagt at de kan hjelpe med snømåking"
                      : `Kan hjelpe med: ${member.can_help.join(", ") || "Ikke oppgitt"}`}
                  </span>
                </label>
                <HelperRating id={member.member_id} />
              </div>
            ))}
          </fieldset>
          {error && (
            <button
              className="text-button"
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Prøv å hente venner igjen
            </button>
          )}
        </>
      )}
      {step === 3 && (
        <>
          <p>Velg datoene som passer deg.</p>
          <p className="worker-mini">Hjelp fra {selectedHelper?.full_name}</p>
          <div className="winter-calendar-heading">
            <h3>
              {new Date(`${month}-01T12:00:00Z`).toLocaleDateString("nb-NO", {
                month: "long",
                year: "numeric",
                timeZone: "Europe/Oslo",
              })}
            </h3>
            <div className="calendar-nav">
              <button
                type="button"
                disabled={month <= today.slice(0, 7)}
                onClick={() => moveMonth(-1)}
                aria-label="Forrige måned"
              >
                ←
              </button>
              <button
                type="button"
                disabled={month >= latest.slice(0, 7)}
                onClick={() => moveMonth(1)}
                aria-label="Neste måned"
              >
                →
              </button>
            </div>
          </div>
          <div
            className="winter-calendar"
            role="group"
            aria-label="Velg én eller flere datoer"
          >
            {["Ma", "Ti", "On", "To", "Fr", "Lø", "Sø"].map((day) => (
              <span className="weekday" key={day} aria-hidden="true">
                {day}
              </span>
            ))}
            {Array.from({ length: offset }, (_, index) => (
              <span key={`empty-${index}`} aria-hidden="true" />
            ))}
            {Array.from({ length: days }, (_, index) => {
              const key = `${month}-${String(index + 1).padStart(2, "0")}`;
              return (
                <button
                  type="button"
                  className="calendar-day"
                  key={key}
                  aria-label={dateLabel(key)}
                  aria-pressed={dates.includes(key)}
                  disabled={
                    key < today ||
                    key > latest ||
                    (dates.length >= 31 && !dates.includes(key))
                  }
                  onClick={() =>
                    setDates(
                      dates.includes(key)
                        ? dates.filter((date) => date !== key)
                        : [...dates, key].sort(),
                    )
                  }
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
          <p className="note" role="status">
            {dates.length
              ? `${dates.length} datoer valgt: ${dates.map(dateLabel).join(", ")}`
              : "Ingen datoer valgt"}
          </p>
          <fieldset className="choices">
            <legend>Tid på dagen</legend>
            {timeChoices.map((choice) => (
              <label className="choice" key={choice}>
                <input
                  type="radio"
                  name="winter-time"
                  checked={time === choice}
                  onChange={() => setTime(choice)}
                />
                <span>{choice}</span>
              </label>
            ))}
          </fieldset>
          <p className="note">
            Datoene er alternativer, ikke flere bestillinger. Avtal tidspunktet
            med vennen din.
          </p>
        </>
      )}
      {step === 4 && (
        <>
          <dl className="summary">
            <dt>Oppgaver</dt>
            <dd>
              <ul>
                {tasks.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </dd>
            <dt>Hjelper</dt>
            <dd>{selectedHelper?.full_name}</dd>
            <dt>Datoer som passer</dt>
            <dd>
              <ul>
                {dates.map((date) => (
                  <li key={date}>{dateLabel(date)}</li>
                ))}
              </ul>
            </dd>
            <dt>Tid på dagen</dt>
            <dd>{time}</dd>
          </dl>
          <p className="note">
            Forespørselen sendes bare til den valgte vennen. Navn og by er
            synlige, men adressen din deles ikke automatisk. Tidspunkt og
            eventuelle utgifter må avtales før jobben bekreftes.
          </p>
        </>
      )}
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
          onClick={() => (step === 1 ? onClose() : changeStep(step - 1))}
        >
          {step === 4 ? "Endre" : "Tilbake"}
        </button>
        <button
          className="button primary"
          disabled={busy || (step === 2 && loading)}
        >
          {busy ? "Sender …" : step === 4 ? "Be om hjelp" : "Neste"}
        </button>
      </div>
    </form>
  );
}
