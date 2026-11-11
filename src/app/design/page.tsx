import type { Metadata } from "next";
import DesignApp from "./design-app";
import "./design.css";

export const metadata: Metadata = {
  title: "En god hverdag | Gjensidige Omtanke",
  description: "En konseptskisse med eksempeldata for en enklere hverdag.",
};

export default function DesignPage() {
  return <DesignApp />;
}
