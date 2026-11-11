"use client";

import { useState } from "react";

export default function Home() {
  const [audience, setAudience] = useState<"user" | "friend">("user");

  return (
    <>
      <header className="app-header">
        <h1>Gjensidige Omtanke</h1>
      </header>
      <main className="app-content" data-audience={audience}>
        <fieldset className="audience-toggle">
          <legend>Velg versjon</legend>
          <div className="audience-options">
            {(["user", "friend"] as const).map((version) => (
              <label className="audience-option" key={version}>
                <input
                  type="radio"
                  name="audience"
                  value={version}
                  checked={audience === version}
                  onChange={() => setAudience(version)}
                />
                <span>{version === "user" ? "Bruker" : "Venn"}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {audience === "user" && (
          <div className="user-actions">
            <button type="button" className="user-button user-button-red">
              R&oslash;d knapp
            </button>
            <button type="button" className="user-button user-button-green">
              Gr&oslash;nn knapp
            </button>
          </div>
        )}
      </main>
    </>
  );
}
