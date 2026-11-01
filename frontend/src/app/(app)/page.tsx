import { mdiArrowRight } from "@mdi/js";
import type { Metadata } from "next";
import Link from "next/link";
import { BarChart } from "@/components/dashboard/bar-chart";
import { DeadlineCard } from "@/components/dashboard/deadline-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineCard } from "@/components/dashboard/pipeline-card";
import { StockCard } from "@/components/dashboard/stock-card";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/ui/card";
import { formatNumber } from "@/lib/format";
import {
  CRITICAL_STOCK,
  DAILY_OUTPUT,
  DASHBOARD_KPIS,
  PIPELINE_STAGES,
  REJECT_BREAKDOWN,
  UPCOMING_DEADLINES,
} from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard Produksi | Sagara Denim",
  description:
    "Ringkasan output harian, antrean tahap produksi, tenggat order, dan stok kritis.",
};

export default function DashboardPage() {
  const totalOutput = DAILY_OUTPUT.reduce((sum, item) => sum + item.value, 0);

  return (
    <>
      <PageHeader
        title="Dashboard Produksi"
        subtitle="Ringkasan produksi celana jeans hari ini, 31 Oktober 2026."
        actions={
          <Link href="/perintah-produksi" className="ds-btn ds-btn-secondary">
            Lihat Perintah Produksi
            <Icon path={mdiArrowRight} size={17} />
          </Link>
        }
      />

      <section className="kpi-grid" aria-label="Indikator produksi">
        {DASHBOARD_KPIS.map((item) => (
          <KpiCard key={item.label} item={item} />
        ))}
      </section>

      <div className="dashboard-main-grid">
        <SectionCard
          className="dashboard-panel chart-panel"
          title="Output Harian"
          subtitle="Total produksi tujuh hari terakhir."
          action={<Badge tone="orange">{formatNumber(totalOutput)} pcs</Badge>}
        >
          <BarChart data={DAILY_OUTPUT} />
        </SectionCard>

        <SectionCard
          className="dashboard-panel chart-panel"
          title="Komposisi Reject"
          subtitle="Dari 210 pcs yang diperiksa."
          action={<Badge tone="red">2,4%</Badge>}
        >
          <DonutChart data={REJECT_BREAKDOWN} />
        </SectionCard>
      </div>

      <div className="dashboard-secondary-grid">
        <PipelineCard stages={PIPELINE_STAGES} />
        <DeadlineCard deadlines={UPCOMING_DEADLINES} />
        <StockCard items={CRITICAL_STOCK} />
      </div>
    </>
  );
}
