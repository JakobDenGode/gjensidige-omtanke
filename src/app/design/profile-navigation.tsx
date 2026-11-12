import Link from "next/link";

export default function ProfileNavigation() {
  return (
    <nav className="mobile-nav" aria-label="Hovedmeny">
      <Link href="/design">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="m3 10 9-7 9 7v11h-7v-7h-4v7H3Z" />
        </svg>
        Hjem
      </Link>
      <Link href="/design?view=appointments">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 5h18v16H3Zm4-3v6m10-6v6M3 11h18" />
        </svg>
        Mine avtaler
      </Link>
      <Link href="/design?view=friends">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5v2M12 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0" />
        </svg>
        Mine venner
      </Link>
      <Link href="/design/profile" aria-current="page">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21v-2a8 8 0 0 1 16 0v2" />
        </svg>
        Min profil
      </Link>
    </nav>
  );
}
