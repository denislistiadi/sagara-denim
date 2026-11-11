import {
  mdiAlertCircleOutline,
  mdiClipboardTextOutline,
  mdiDeleteOutline,
  mdiTshirtCrewOutline,
} from "@mdi/js";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/format";
import type { KpiItem, ProductionReportSummary } from "@/types";

interface ReportSummaryProps {
  summary?: ProductionReportSummary;
  loading: boolean;
}

export function ReportSummary({ summary, loading }: ReportSummaryProps) {
  if (loading && !summary) {
    return (
      <section
        className="report-summary-grid"
        aria-label="Ringkasan laporan"
        aria-busy="true"
      >
        {Array.from({ length: 4 }).map((_, index) => (
          <article className="kpi-card" key={index}>
            <div className="kpi-top">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-28" />
            <div className="kpi-footer">
              <Skeleton className="h-3 w-32" />
            </div>
          </article>
        ))}
      </section>
    );
  }

  const cards: KpiItem[] = [
    {
      label: "Output",
      value: formatNumber(summary?.total_output ?? 0),
      unit: "pcs",
      icon: mdiTshirtCrewOutline,
      tone: "green",
      subtext: `${formatNumber(summary?.logs_count ?? 0)} log · ${formatNumber(summary?.orders_logged ?? 0)} order`,
    },
    {
      label: "Reject",
      value: formatNumber(summary?.total_reject ?? 0),
      unit: "pcs",
      icon: mdiAlertCircleOutline,
      tone: "red",
      subtext: `${formatPercent(summary?.reject_ratio ?? 0)} dari output + reject + scrap`,
    },
    {
      label: "Scrap",
      value: formatNumber(summary?.total_scrap ?? 0),
      unit: "pcs",
      icon: mdiDeleteOutline,
      tone: "orange",
      subtext: `${formatPercent(summary?.scrap_ratio ?? 0)} dari output + reject + scrap`,
    },
    {
      label: "Hari Tercatat",
      value: formatNumber(summary?.days_count ?? 0),
      unit: "hari",
      icon: mdiClipboardTextOutline,
      tone: "purple",
      subtext: "Tanggal unik dengan log produksi",
    },
  ];

  return (
    <section className="report-summary-grid" aria-label="Ringkasan laporan">
      {cards.map((item) => (
        <KpiCard key={item.label} item={item} />
      ))}
    </section>
  );
}
