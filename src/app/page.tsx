"use client";

import { useState } from "react";

export default function Home() {
  const [audience, setAudience] = useState<"eldre" | "yngre">("eldre");

  return (
    <>
      <header className="app-header">
        <h1>Gjensidige Omtanke</h1>
      </header>
      <main className="app-content" data-audience={audience}>
        <fieldset className="audience-toggle">
          <legend>Velg versjon</legend>
          <div className="audience-options">
            {(["eldre", "yngre"] as const).map((version) => (
              <label className="audience-option" key={version}>
                <input
                  type="radio"
                  name="audience"
                  value={version}
                  checked={audience === version}
                  onChange={() => setAudience(version)}
                />
                <span>{version === "eldre" ? "Eldre" : "Yngre"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {audience === "eldre" && (
          <div className="elder-actions">
            <button type="button" className="elder-button elder-button-red">
              R&oslash;d knapp
            </button>
            <button type="button" className="elder-button elder-button-green">
              Gr&oslash;nn knapp
            </button>
          </div>
        )}
      </main>
    </>
  );
}
