import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke aplikasi manajemen produksi Sagara Denim.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginScreen />
    </Suspense>
  );
}
