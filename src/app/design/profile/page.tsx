import type { Metadata } from "next";
import Account from "../account";
import Link from "next/link";
import "../design.css";

export const metadata: Metadata = { title: "Min profil | Gjensidige Omtanke" };

export default function ProfilePage() {
  return (
    <div className="design-app">
      <Account>
        <Link href="/design">Tilbake til hjem</Link>
      </Account>
    </div>
  );
}
