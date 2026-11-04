import type { Metadata } from "next";
import { ReportWorkspace } from "@/components/reports/report-workspace";

export const instant = false;

export const metadata: Metadata = {
  title: "Laporan Produksi",
  description: "Rekap output dan reject produksi berdasarkan tanggal log.",
};

export default function LaporanPage() {
  return <ReportWorkspace />;
}
