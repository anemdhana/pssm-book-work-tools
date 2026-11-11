"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteHeader() {
  const pathname = usePathname();
  const library = pathname === "/";

  return (
    <header className="site-header">
      <Link href="/" className="brand">
        PSSM BOOK WORK
      </Link>
      <nav aria-label="Primary">
        <Link href="/" aria-current={library ? "page" : undefined}>
          Library
        </Link>
      </nav>
    </header>
  );
}
