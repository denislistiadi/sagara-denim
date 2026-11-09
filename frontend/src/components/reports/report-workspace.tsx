"use client";

import { mdiAlertCircleOutline, mdiChartBoxOutline } from "@mdi/js";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { ExportReportButton } from "@/components/reports/export-report-button";
import { ReportDailyTable } from "@/components/reports/report-daily-table";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportLogTable } from "@/components/reports/report-log-table";
import { ReportStageTable } from "@/components/reports/report-stage-table";
import { ReportSummary } from "@/components/reports/report-summary";
import { Button } from "@/components/ui/button";
import { type DateRange } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import { ApiError, downloadProductionReportCsv } from "@/lib/api";
import { addDays, compareISO, isValidISO, todayISO } from "@/lib/date";
import { productionReportQuery } from "@/lib/query/definitions";
import type { ProductionStage } from "@/types";
import type { ReportStageFilter } from "@/components/reports/report-filters";

function defaultRange(): DateRange {
  const end = todayISO();
  return { start: addDays(end, -6), end };
}

export function ReportWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const orderCode = searchParams.get("order_code");
  const [range, setRange] = useState<DateRange>(() => {
    const start = searchParams.get("start_date");
    const end = searchParams.get("end_date");

    if (
      start &&
      end &&
      isValidISO(start) &&
      isValidISO(end) &&
      compareISO(start, end) <= 0
    ) {
      return { start, end };
    }

    return defaultRange();
  });
  const [stage, setStage] = useState<ReportStageFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const invalidRange = compareISO(range.start, range.end) > 0;

  const report = useQuery({
    ...productionReportQuery({
      startDate: range.start,
      endDate: range.end,
      stage: stage === "all" ? undefined : stage,
      orderId: orderId ?? undefined,
      page,
      pageSize,
    }),
    enabled: !invalidRange,
  });

  const data = report.data ?? null;
  const loading = report.isFetching;
  const error = report.error
    ? report.error instanceof Error
      ? report.error.message
      : "Laporan produksi gagal dimuat."
    : null;

  const exportMutation = useMutation({
    mutationFn: () =>
      downloadProductionReportCsv({
        start_date: range.start,
        end_date: range.end,
        stage: stage === "all" ? null : stage,
        order_id: orderId,
      }),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    },
  });

  const exporting = exportMutation.isPending;
  const exportError = exportMutation.error
    ? exportMutation.error instanceof ApiError
      ? exportMutation.error.message
      : "Export CSV gagal. Silakan coba lagi."
    : null;

  // Respons bisa mengecil setelah filter berubah; koreksi halaman saat render
  // agar tidak ada request tambahan ke halaman yang sudah tidak ada.
  if (data && data.logs.total_pages > 0 && page > data.logs.total_pages) {
    setPage(data.logs.total_pages);
  }

  const displayError = invalidRange
    ? "Tanggal awal tidak boleh melebihi tanggal akhir."
    : error;

  function handleRangeChange(nextRange: DateRange) {
    setRange(nextRange);
    setPage(1);
    exportMutation.reset();
  }

  function handleStageChange(nextStage: ProductionStage | "all") {
    setStage(nextStage);
    setPage(1);
    exportMutation.reset();
  }

  function handleReset() {
    setRange(defaultRange());
    setStage("all");
    setPage(1);
    setPageSize(20);
    exportMutation.reset();
    router.replace("/laporan");
  }

  function handleClearOrderFilter() {
    setPage(1);
    exportMutation.reset();
    router.replace("/laporan");
  }

  function handleExport() {
    if (!data || data.logs.total === 0 || exporting) {
      return;
    }

    exportMutation.mutate();
  }

  return (
    <>
      <PageHeader
        title="Laporan Produksi"
        subtitle="Rekap output, reject, dan kualitas produksi berdasarkan tanggal log."
        actions={
          <div className="report-export">
            <ExportReportButton
              disabled={!data || data.logs.total === 0}
              loading={exporting}
              onExport={handleExport}
            />
            {exportError && (
              <p className="report-export-error" role="alert">
                {exportError}
              </p>
            )}
          </div>
        }
      />

      <ReportFilters
        range={range}
        stage={stage}
        onRangeChange={handleRangeChange}
        onStageChange={handleStageChange}
        onReset={handleReset}
      />

      {orderId && (
        <div className="report-order-filter" role="status">
          <div className="report-order-filter-copy">
            <strong>Filter perintah aktif</strong>
            <span>
              {orderCode
                ? `${orderCode} — hanya log perintah ini yang ditampilkan.`
                : "Hanya log perintah yang dipilih yang ditampilkan."}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearOrderFilter}
          >
            Tampilkan semua
          </Button>
        </div>
      )}

      {displayError && (
        <div className="report-error" role="alert">
          <Icon path={mdiAlertCircleOutline} size={18} />
          <span>{displayError}</span>
        </div>
      )}

      <ReportSummary summary={data?.summary} loading={loading} />

      {data && data.logs.total === 0 && !loading ? (
        <div className="table-card report-empty-card">
          <EmptyState
            icon={mdiChartBoxOutline}
            title="Belum ada log produksi"
            description={
              orderId
                ? `Tidak ada log untuk perintah ${
                    orderCode ?? "yang dipilih"
                  } pada periode ini. Ubah periode atau tampilkan semua order.`
                : "Tidak ada log pada periode dan tahap yang dipilih. Ubah filter atau atur ulang periode."
            }
          />
        </div>
      ) : (
        <>
          <div className="report-panels">
            <ReportDailyTable rows={data?.daily ?? []} loading={loading} />
            {stage === "all" && (
              <ReportStageTable rows={data?.stages ?? []} loading={loading} />
            )}
          </div>

          <ReportLogTable
            logs={data?.logs}
            loading={loading}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        </>
      )}
    </>
  );
}
