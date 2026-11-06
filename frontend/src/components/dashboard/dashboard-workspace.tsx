"use client";

import {
  mdiAlertCircleOutline,
  mdiArrowRight,
  mdiClipboardTextOutline,
  mdiClockOutline,
  mdiContentCut,
  mdiHanger,
  mdiPaletteOutline,
  mdiScissorsCutting,
  mdiTshirtCrewOutline,
} from "@mdi/js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BarChart } from "@/components/dashboard/bar-chart";
import { DeadlineCard } from "@/components/dashboard/deadline-card";
import { DonutChart } from "@/components/dashboard/donut-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { PipelineCard } from "@/components/dashboard/pipeline-card";
import { StockCard } from "@/components/dashboard/stock-card";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboard } from "@/lib/api";
import {
  formatLongDate,
  formatNumber,
  formatPercent,
  formatQuantity,
} from "@/lib/format";
import type {
  DashboardSummary,
  DeadlineItem,
  KpiItem,
  OutputPoint,
  PipelineStage,
  ProductionStage,
  RejectPoint,
  StockItem,
  StockStatus,
} from "@/types";

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

const STAGE_META: Record<
  ProductionStage,
  { label: string; color: string }
> = {
  cutting: { label: "Cutting", color: "#3B82F6" },
  jahit: { label: "Jahit", color: "#FF5B00" },
  finishing: { label: "Finishing", color: "#8B5CF6" },
  qc: { label: "QC", color: "#10B981" },
};

const PIPELINE_META: Record<
  PipelineStage["label"],
  { icon: string; color: string }
> = {
  Menunggu: { icon: mdiClockOutline, color: "#F59E0B" },
  Cutting: { icon: mdiContentCut, color: "#3B82F6" },
  Jahit: { icon: mdiScissorsCutting, color: "#FF5B00" },
  Finishing: { icon: mdiPaletteOutline, color: "#8B5CF6" },
  QC: { icon: mdiHanger, color: "#10B981" },
};

const STOCK_STATUS_LABEL: Record<StockStatus, StockItem["status"]> = {
  habis: "Habis",
  kritis: "Kritis",
  menipis: "Menipis",
  aman: "Aman",
};

function dayLabel(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : DAY_LABELS[date.getDay()];
}

function decimalPercent(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 1,
  }).format(value);
}

function buildKpis(summary: DashboardSummary): KpiItem[] {
  const { kpis } = summary;
  const onTimeRatio = kpis.on_time_delivery_ratio;
  const inspectedToday = kpis.today_output + kpis.today_reject;

  return [
    {
      label: "Order Aktif",
      value: formatNumber(kpis.active_orders),
      unit: "order",
      icon: mdiClipboardTextOutline,
      tone: "orange",
      subtext: `${formatNumber(kpis.new_orders_today)} order masuk hari ini`,
    },
    {
      label: "Output Hari Ini",
      value: formatNumber(kpis.today_output),
      unit: "pcs",
      icon: mdiTshirtCrewOutline,
      tone: "green",
      subtext: `Kemarin ${formatNumber(kpis.yesterday_output)} pcs`,
    },
    {
      label: "Reject Rate",
      value: decimalPercent(kpis.today_reject_ratio),
      unit: "%",
      icon: mdiAlertCircleOutline,
      tone: "blue",
      subtext: `${formatNumber(kpis.today_reject)} pcs dari ${formatNumber(inspectedToday)} pcs diperiksa`,
    },
    {
      label: "On-Time Delivery",
      value: onTimeRatio === null ? "—" : decimalPercent(onTimeRatio),
      unit: onTimeRatio === null ? undefined : "%",
      icon: mdiClockOutline,
      tone: "purple",
      subtext:
        onTimeRatio === null
          ? "Belum ada order selesai dalam 30 hari terakhir"
          : `${formatNumber(kpis.on_time_orders_30d)} dari ${formatNumber(kpis.completed_orders_30d)} order tepat waktu`,
    },
  ];
}

function buildOutput(summary: DashboardSummary): OutputPoint[] {
  return summary.daily_output.map((item) => ({
    day: dayLabel(item.date),
    value: item.output_qty,
  }));
}

function buildReject(summary: DashboardSummary): RejectPoint[] {
  return summary.reject_breakdown.map((item) => ({
    label: STAGE_META[item.stage].label,
    value: item.reject_qty,
    color: STAGE_META[item.stage].color,
  }));
}

function buildPipeline(summary: DashboardSummary): PipelineStage[] {
  const total = summary.pipeline.reduce(
    (sum, stage) => sum + stage.order_count,
    0,
  );

  const labels: Record<string, PipelineStage["label"]> = {
    menunggu: "Menunggu",
    cutting: "Cutting",
    jahit: "Jahit",
    finishing: "Finishing",
    qc: "QC",
  };

  return summary.pipeline.map((stage) => {
    const label = labels[stage.status] ?? "Menunggu";
    return {
      label,
      count: stage.order_count,
      percent: total > 0 ? Math.round((stage.order_count / total) * 100) : 0,
      icon: PIPELINE_META[label].icon,
      color: PIPELINE_META[label].color,
    };
  });
}

function buildDeadlines(summary: DashboardSummary): DeadlineItem[] {
  return summary.upcoming_deadlines.map((item) => ({
    code: item.code,
    model: item.model_summary,
    customer: item.customer_name ?? "Tanpa pelanggan",
    deadline: item.deadline,
    priority: item.priority,
    isOverdue: item.is_overdue,
  }));
}

function buildStock(summary: DashboardSummary): StockItem[] {
  return summary.critical_stock.map((item) => ({
    name: item.name,
    detail: item.category,
    stock: `${formatQuantity(item.stock_qty)} ${item.unit}`,
    percent: item.percent,
    status: STOCK_STATUS_LABEL[item.status],
  }));
}

function DashboardSkeleton() {
  return (
    <>
      <PageHeader
        title="Dashboard Produksi"
        subtitle="Memuat ringkasan produksi hari ini..."
      />
      <section className="kpi-grid" aria-label="Memuat indikator produksi">
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="kpi-card" key={index}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </section>
      <div className="dashboard-main-grid">
        <div className="ds-card">
          <Skeleton className="h-80 w-full" />
        </div>
        <div className="ds-card">
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
      <div className="dashboard-secondary-grid">
        {Array.from({ length: 3 }).map((_, index) => (
          <div className="ds-card" key={index}>
            <Skeleton className="h-72 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

export function DashboardWorkspace() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await getDashboard();
        if (active) {
          setData(response);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Ringkasan dashboard gagal dimuat.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (loading && !data) {
    return <DashboardSkeleton />;
  }

  if (loadError || !data) {
    return (
      <>
        <PageHeader
          title="Dashboard Produksi"
          subtitle="Ringkasan produksi hari ini."
        />
        <EmptyState
          icon={mdiAlertCircleOutline}
          title="Dashboard gagal dimuat"
          description={loadError ?? "Data dashboard belum tersedia."}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReloadKey((current) => current + 1)}
            >
              Coba lagi
            </Button>
          }
        />
      </>
    );
  }

  const kpis = buildKpis(data);
  const output = buildOutput(data);
  const reject = buildReject(data);
  const pipeline = buildPipeline(data);
  const deadlines = buildDeadlines(data);
  const stock = buildStock(data);

  const totalOutput = output.reduce((sum, item) => sum + item.value, 0);
  const totalReject = reject.reduce((sum, item) => sum + item.value, 0);
  const totalInspected = totalOutput + totalReject;
  const rejectRatio =
    totalInspected > 0 ? (totalReject / totalInspected) * 100 : 0;

  return (
    <>
      <PageHeader
        title="Dashboard Produksi"
        subtitle={`Ringkasan produksi per ${formatLongDate(data.business_date)} WIB.`}
        actions={
          <Link href="/perintah-produksi" className="ds-btn ds-btn-secondary">
            Lihat Perintah Produksi
            <Icon path={mdiArrowRight} size={17} />
          </Link>
        }
      />

      <section className="kpi-grid" aria-label="Indikator produksi">
        {kpis.map((item) => (
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
          <BarChart data={output} />
        </SectionCard>

        <SectionCard
          className="dashboard-panel chart-panel"
          title="Komposisi Reject"
          subtitle={`Dari ${formatNumber(totalInspected)} pcs yang diperiksa dalam tujuh hari.`}
          action={
            <Badge tone={totalReject > 0 ? "red" : "green"}>
              {formatPercent(rejectRatio, 1)}
            </Badge>
          }
        >
          <DonutChart data={reject} />
        </SectionCard>
      </div>

      <div className="dashboard-secondary-grid">
        <PipelineCard stages={pipeline} />
        <DeadlineCard deadlines={deadlines} />
        <StockCard items={stock} />
      </div>
    </>
  );
}
