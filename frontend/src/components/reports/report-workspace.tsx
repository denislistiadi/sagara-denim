"use client";

import { mdiAlertCircleOutline, mdiChartBoxOutline } from "@mdi/js";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { ExportReportButton } from "@/components/reports/export-report-button";
import { ReportDailyTable } from "@/components/reports/report-daily-table";
import { ReportFilters } from "@/components/reports/report-filters";
import { ReportLogTable } from "@/components/reports/report-log-table";
import { ReportStageTable } from "@/components/reports/report-stage-table";
import { ReportSummary } from "@/components/reports/report-summary";
import { type DateRange } from "@/components/ui/date-picker";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ApiError,
  downloadProductionReportCsv,
  getProductionReport,
} from "@/lib/api";
import { addDays, compareISO, todayISO } from "@/lib/date";
import type { ProductionReportResponse, ProductionStage } from "@/types";
import type { ReportStageFilter } from "@/components/reports/report-filters";

function defaultRange(): DateRange {
  const end = todayISO();
  return { start: addDays(end, -6), end };
}

export function ReportWorkspace() {
  const [range, setRange] = useState<DateRange>(defaultRange);
  const [stage, setStage] = useState<ReportStageFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<ProductionReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const invalidRange = compareISO(range.start, range.end) > 0;
  const displayError = invalidRange
    ? "Tanggal awal tidak boleh melebihi tanggal akhir."
    : error;

  useEffect(() => {
    if (invalidRange) {
      return;
    }

    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await getProductionReport(
          {
            start_date: range.start,
            end_date: range.end,
            stage: stage === "all" ? null : stage,
            page,
            page_size: pageSize,
          },
          { signal: controller.signal },
        );

        if (!active) {
          return;
        }

        setData(response);

        if (response.logs.total_pages > 0 && page > response.logs.total_pages) {
          setPage(response.logs.total_pages);
        }
      } catch (caught) {
        if (!active || controller.signal.aborted) {
          return;
        }

        if (caught instanceof DOMException && caught.name === "AbortError") {
          return;
        }

        setError(
          caught instanceof Error
            ? caught.message
            : "Laporan produksi gagal dimuat.",
        );
      } finally {
        if (active && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
      controller.abort();
    };
  }, [invalidRange, page, pageSize, range.end, range.start, stage]);

  function handleRangeChange(nextRange: DateRange) {
    setRange(nextRange);
    setPage(1);
    setExportError(null);
  }

  function handleStageChange(nextStage: ProductionStage | "all") {
    setStage(nextStage);
    setPage(1);
    setExportError(null);
  }

  function handleReset() {
    setRange(defaultRange());
    setStage("all");
    setPage(1);
    setPageSize(20);
    setExportError(null);
  }

  async function handleExport() {
    if (!data || data.logs.total === 0 || exporting) {
      return;
    }

    setExporting(true);
    setExportError(null);

    try {
      const { blob, filename } = await downloadProductionReportCsv({
        start_date: range.start,
        end_date: range.end,
        stage: stage === "all" ? null : stage,
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (caught) {
      setExportError(
        caught instanceof ApiError
          ? caught.message
          : "Export CSV gagal. Silakan coba lagi.",
      );
    } finally {
      setExporting(false);
    }
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
              onExport={() => {
                void handleExport();
              }}
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
            description="Tidak ada log pada periode dan tahap yang dipilih. Ubah filter atau atur ulang periode."
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
