import type { Metadata } from "next";
import DesignApp from "./design-app";
import Account from "./account";
import "./design.css";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "En god hverdag | Gjensidige Omtanke",
  description: "En konseptskisse med eksempeldata for en enklere hverdag.",
};

export default function DesignPage() {
  return (
    <div className="design-app">
      <Account>
        <Suspense fallback={<p role="status">Laster …</p>}>
          <DesignApp />
        </Suspense>
      </Account>
    </div>
  );
}
