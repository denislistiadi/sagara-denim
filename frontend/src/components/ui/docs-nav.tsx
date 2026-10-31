"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

interface DocsLink {
  href: string;
  label: string;
  exact?: boolean;
}

const DOCS_LINKS: readonly DocsLink[] = [
  { href: "/design-system", label: "Ringkasan", exact: true },
  { href: "/design-system/fondasi", label: "Fondasi" },
  { href: "/design-system/komponen", label: "Komponen" },
  { href: "/design-system/pola", label: "Pola" },
] as const;

export function DocsNav() {
  const pathname = usePathname();

  return (
    <nav className="docs-nav" aria-label="Navigasi design system">
      {DOCS_LINKS.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn("docs-nav-link", active && "docs-nav-link-active")}
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
