import type { Metadata } from "next";
import { DashboardWorkspace } from "@/components/dashboard/dashboard-workspace";

export const instant = false;

export const metadata: Metadata = {
  title: "Dashboard Produksi | Sagara Denim",
  description:
    "Ringkasan output harian, antrean tahap produksi, tenggat order, dan stok kritis.",
};

export default function DashboardPage() {
  return <DashboardWorkspace />;
}
