"use client";

import {
  mdiEmailOutline,
  mdiEyeOffOutline,
  mdiEyeOutline,
  mdiLockOutline,
} from "@mdi/js";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BrandMark } from "@/components/brand-mark";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { ApiError } from "@/lib/api";

const DEFAULT_NEXT = "/";

function resolveNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_NEXT;
  }

  return value;
}

export function LoginScreen() {
  const { status, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = resolveNext(searchParams.get("next"));
  const expired = searchParams.get("reason") === "expired";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(next);
    }
  }, [next, router, status]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      router.replace(next);
    } catch (submitError) {
      if (submitError instanceof ApiError) {
        setError(submitError.message);
      } else {
        setError("Tidak dapat menghubungi server. Silakan coba lagi.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <aside className="auth-brand-panel">
        <div className="auth-brand-top">
          <BrandMark />
        </div>

        <div className="auth-brand-copy">
          <span className="auth-eyebrow">Manajemen Produksi</span>
          <h1>Kelola perintah produksi dari cutting sampai selesai.</h1>
          <p>
            Satu tempat untuk memantau model, jumlah, tenggat, dan kualitas
            produksi celana jeans Sagara Denim.
          </p>
          <ul className="auth-feature-list">
            <li>Perintah produksi dengan banyak model dalam satu dokumen.</li>
            <li>Status, prioritas, dan tenggat yang selalu terlihat.</li>
            <li>Akses sesuai peran admin, operator, dan QC.</li>
          </ul>
        </div>

        <p className="auth-brand-footer">
          Sagara Denim <span aria-hidden="true">·</span> Produksi Celana Jeans
        </p>
      </aside>

      <main className="auth-form-panel">
        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <BrandMark />
          </div>

          <div className="auth-form-head">
            <h2>Masuk ke akun Anda</h2>
            <p>Gunakan email dan kata sandi yang diberikan admin produksi.</p>
          </div>

          {expired && (
            <div className="auth-notice" role="status">
              Sesi berakhir. Silakan masuk kembali untuk melanjutkan.
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="dialog-field">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="nama@sagara.co.id"
                prefix={<Icon path={mdiEmailOutline} size={17} />}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="dialog-field">
              <Label htmlFor="login-password">Kata Sandi</Label>
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="Masukkan kata sandi"
                prefix={<Icon path={mdiLockOutline} size={17} />}
                suffix={
                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={
                      showPassword
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    <Icon
                      path={showPassword ? mdiEyeOffOutline : mdiEyeOutline}
                      size={17}
                    />
                  </button>
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={6}
              />
            </div>

            {error && (
              <p className="auth-error" role="alert">
                {error}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              className="auth-submit"
              loading={submitting}
            >
              Masuk
            </Button>
          </form>

          <p className="auth-form-footer">
            Hubungi admin produksi jika Anda belum memiliki akses.
          </p>
        </div>
      </main>
    </div>
  );
}
