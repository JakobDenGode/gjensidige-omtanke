"use client";

import { useEffect, useRef, useState } from "react";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};

export default function SpeechInput({
  value,
  onChange,
  onUse,
  onBack,
}: {
  value: string;
  onChange: (value: string) => void;
  onUse: () => void;
  onBack: () => void;
}) {
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState(
    "Trykk Start opptak for å prøve tale på norsk. Du kan alltid skrive selv.",
  );

  useEffect(() => {
    function stopOnHide() {
      if (document.hidden) recognition.current?.stop();
    }
    function abort() {
      const current = recognition.current;
      recognition.current = null;
      if (current) {
        current.onresult = null;
        current.onerror = null;
        current.onend = null;
        current.abort();
      }
    }
    document.addEventListener("visibilitychange", stopOnHide);
    window.addEventListener("pagehide", abort);
    return () => {
      abort();
      document.removeEventListener("visibilitychange", stopOnHide);
      window.removeEventListener("pagehide", abort);
    };
  }, []);

  function start() {
    const speechWindow = window as SpeechWindow;
    const Constructor =
      speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Constructor) {
      setMessage(
        "Tale til tekst er ikke tilgjengelig i denne nettleseren. Skriv i feltet nedenfor.",
      );
      return;
    }
    if (recognition.current) return;
    const base = value.trim();
    let failed = false;
    try {
      const current = new Constructor();
      recognition.current = current;
      current.lang = "nb-NO";
      current.continuous = true;
      current.interimResults = false;
      current.onresult = (event) => {
        if (recognition.current !== current) return;
        const words = Array.from(event.results)
          .filter((result) => result.isFinal)
          .map((result) => result[0].transcript)
          .join(" ");
        onChange([base, words].filter(Boolean).join(" ").slice(0, 2000));
      };
      current.onerror = (event) => {
        if (recognition.current !== current) return;
        failed = true;
        const errors: Record<string, string> = {
          "not-allowed":
            "Mikrofontilgang ble ikke tillatt. Du kan skrive selv.",
          "audio-capture": "Fant ingen mikrofon. Du kan skrive selv.",
          "no-speech": "Hørte ingen tale. Prøv igjen eller skriv selv.",
          network:
            "Kunne ikke koble til talegjenkjenningen. Skriv selv eller prøv igjen.",
        };
        setMessage(
          errors[event.error] ??
            "Opptaket kunne ikke fullføres. Du kan skrive selv.",
        );
      };
      current.onend = () => {
        if (recognition.current !== current) return;
        recognition.current = null;
        setListening(false);
        if (!failed)
          setMessage(
            "Opptaket er stoppet. Se over og rett teksten før du bruker den.",
          );
      };
      setListening(true);
      setMessage(
        "Lytter når mikrofontilgang er gitt. Trykk Stopp opptak når du er ferdig.",
      );
      current.start();
    } catch {
      recognition.current = null;
      setListening(false);
      setMessage(
        "Kunne ikke starte mikrofonen. Du kan skrive i feltet i stedet.",
      );
    }
  }

  return (
    <>
      <p>Fortell hva du trenger hjelp til, eller hva du kan bidra med.</p>
      <p className="note">
        Nettleseren kan sende lyd til sin talegjenkjenningstjeneste. Ikke si
        helseopplysninger eller andre sensitive opplysninger. Mikrofonen starter
        bare når du trykker Start opptak og gir tillatelse.
      </p>
      <p className="voice-status" role="status" data-listening={listening}>
        {message}
      </p>
      <div className="voice-controls">
        <button className="button outline" disabled={listening} onClick={start}>
          Start opptak
        </button>
        <button
          className="button outline"
          disabled={!listening}
          onClick={() => recognition.current?.stop()}
        >
          Stopp opptak
        </button>
      </div>
      <label className="voice-label" htmlFor="design-voice-text">
        Dette vil jeg si
      </label>
      <textarea
        id="design-voice-text"
        value={value}
        maxLength={2000}
        readOnly={listening}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Teksten kommer her. Du kan også skrive selv."
      />
      <p className="note">
        Ingenting lagres eller sendes som forespørsel før du bekrefter.
      </p>
      <div className="dialog-actions">
        <button className="text-button" onClick={onBack}>
          Tilbake
        </button>
        <button
          className="button primary"
          disabled={listening || !value.trim()}
          onClick={onUse}
        >
          Bruk teksten
        </button>
      </div>
    </>
  );
}
