"use client";

import { mdiAlertCircleOutline, mdiRefresh } from "@mdi/js";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";

export function AuthGate({ children }: { children: ReactNode }) {
  const { status, sessionExpired, retry } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status !== "unauthenticated") {
      return;
    }

    const currentPath = `${window.location.pathname}${window.location.search}`;
    const params = new URLSearchParams({ next: currentPath || "/" });
    if (sessionExpired) {
      params.set("reason", "expired");
    }

    router.replace(`/login?${params.toString()}`);
  }, [router, sessionExpired, status]);

  if (status === "error") {
    return (
      <main className="auth-state">
        <div className="auth-state-card">
          <BrandMark />
          <span className="auth-state-icon" aria-hidden="true">
            <Icon path={mdiAlertCircleOutline} size={24} />
          </span>
          <h1>Tidak dapat menghubungi server</h1>
          <p>
            Sesi belum dapat diperiksa. Periksa koneksi jaringan lalu coba
            lagi.
          </p>
          <Button onClick={retry}>
            <Icon path={mdiRefresh} size={17} />
            Coba lagi
          </Button>
        </div>
      </main>
    );
  }

  if (status !== "authenticated") {
    return (
      <main className="auth-splash" aria-label="Memeriksa sesi">
        <BrandMark />
        <span className="auth-splash-spinner" aria-hidden="true" />
        <p>Memeriksa sesi Anda...</p>
      </main>
    );
  }

  return children;
}
