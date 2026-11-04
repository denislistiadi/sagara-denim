import {
  mdiAlertCircleOutline,
  mdiChartBoxOutline,
  mdiClipboardTextOutline,
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
      subtext: `${formatNumber(summary?.logs_count ?? 0)} log`,
    },
    {
      label: "Reject",
      value: formatNumber(summary?.total_reject ?? 0),
      unit: "pcs",
      icon: mdiAlertCircleOutline,
      tone: "red",
      subtext: `${formatNumber(summary?.days_count ?? 0)} hari`,
    },
    {
      label: "Rasio Reject",
      value: formatPercent(summary?.reject_ratio ?? 0),
      icon: mdiChartBoxOutline,
      tone: "blue",
      subtext: "Dari output + reject",
    },
    {
      label: "Order Tercatat",
      value: formatNumber(summary?.orders_logged ?? 0),
      unit: "order",
      icon: mdiClipboardTextOutline,
      tone: "purple",
      subtext: "Order unik dengan log",
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
