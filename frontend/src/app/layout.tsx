import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Sagara Denim — Manajemen Produksi Celana Jeans",
    template: "%s | Sagara Denim",
  },
  description:
    "Design system dan dasbor manajemen produksi celana jeans Sagara Denim.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <TooltipProvider delayDuration={180}>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
