"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/cn";
import { useMediaQuery } from "@/lib/use-media-query";

export function AppShell({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width: 959px)");

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  function handleToggleSidebar() {
    if (isMobile) {
      setMobileOpen((current) => !current);
      return;
    }

    setExpanded((current) => !current);
  }

  return (
    <div className="app-root">
      <a href="#main-content" className="skip-link">
        Lewati ke konten
      </a>

      <Sidebar
        expanded={expanded}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      <button
        type="button"
        className="app-overlay"
        data-visible={mobileOpen ? "true" : "false"}
        onClick={() => setMobileOpen(false)}
        aria-label="Tutup menu navigasi"
        tabIndex={mobileOpen ? 0 : -1}
      />

      <div className={cn("app-main", !expanded && "app-main-rail")}>
        <Header
          expanded={expanded}
          mobileOpen={mobileOpen}
          onToggleSidebar={handleToggleSidebar}
        />
        <main id="main-content" className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
