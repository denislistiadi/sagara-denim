import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ReportWorkspace } from "@/components/reports/report-workspace";
import { TableSkeleton } from "@/components/ui/skeleton";

export const instant = false;

export const metadata: Metadata = {
  title: "Laporan Produksi",
  description: "Rekap output dan reject produksi berdasarkan tanggal log.",
};

function ReportFallback() {
  return (
    <>
      <PageHeader
        title="Laporan Produksi"
        subtitle="Memuat laporan produksi..."
      />
      <div className="table-card">
        <TableSkeleton rows={5} />
      </div>
    </>
  );
}

export default function LaporanPage() {
  return (
    <Suspense fallback={<ReportFallback />}>
      <ReportWorkspace />
    </Suspense>
  );
}
