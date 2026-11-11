import { mdiClipboardTextOutline } from "@mdi/js";
import Link from "next/link";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import {
  PRODUCTION_STAGE_LABELS,
  PRODUCTION_STAGE_TONE,
} from "@/lib/labels";
import type { ProductionReportLogList } from "@/types";

const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;

interface ReportLogTableProps {
  logs?: ProductionReportLogList;
  loading: boolean;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function ReportLogTable({
  logs,
  loading,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: ReportLogTableProps) {
  const items = logs?.items ?? [];
  const total = logs?.total ?? 0;
  const currentPage = logs?.page ?? 1;
  const totalPages = logs?.total_pages ?? 0;
  const pageStart = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, total);

  return (
    <section className="table-card report-log-card" aria-label="Log produksi">
      <div className="table-toolbar report-panel-head">
        <div>
          <h2 className="report-panel-title">Log Produksi</h2>
          <p className="report-panel-subtitle">
            Rincian log pada periode dan tahap yang dipilih.
          </p>
        </div>
        <Badge tone="orange">{formatNumber(total)} log</Badge>
      </div>

      {loading && !logs ? (
        <TableSkeleton rows={6} />
      ) : items.length === 0 ? (
        <div className="report-empty">
          <EmptyState
            icon={mdiClipboardTextOutline}
            title="Log produksi tidak ditemukan"
            description="Tidak ada log yang cocok dengan filter laporan saat ini."
          />
        </div>
      ) : (
        <>
          <div className="report-table-wrap" aria-busy={loading || undefined}>
            <table className="ds-table report-table report-log-table">
              <caption className="sr-only">
                Daftar log produksi sesuai periode dan tahap
              </caption>
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Order</th>
                  <th scope="col">Pelanggan</th>
                  <th scope="col">Tahap</th>
                  <th scope="col" className="report-number">
                    Output
                  </th>
                  <th scope="col" className="report-number">
                    Reject
                  </th>
                  <th scope="col" className="report-number">
                    Scrap
                  </th>
                  <th scope="col" className="report-number">
                    Rasio Reject
                  </th>
                  <th scope="col" className="report-number">
                    Rasio Scrap
                  </th>
                  <th scope="col">Dicatat Oleh</th>
                  <th scope="col">Catatan</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="table-date">
                        {formatDate(item.log_date, true)}
                      </span>
                    </td>
                    <td>
                      <div className="report-log-order">
                        <div className="report-log-order-line">
                          {item.order_archived ? (
                            <span className="table-primary">
                              {item.order_code}
                            </span>
                          ) : (
                            <Link
                              href={`/perintah-produksi/${item.order_id}`}
                              className="table-primary table-primary-link"
                            >
                              {item.order_code}
                            </Link>
                          )}
                          {item.order_archived && (
                            <Badge tone="neutral">Diarsipkan</Badge>
                          )}
                        </div>
                        <StatusBadge status={item.order_status} />
                      </div>
                    </td>
                    <td>
                      {item.customer ? (
                        <>
                          <span className="report-log-customer">
                            {item.customer.name}
                          </span>
                          <div className="table-secondary">
                            {item.customer.code}
                          </div>
                        </>
                      ) : (
                        <span className="table-secondary">Tanpa pelanggan</span>
                      )}
                    </td>
                    <td>
                      <Badge tone={PRODUCTION_STAGE_TONE[item.stage]}>
                        {PRODUCTION_STAGE_LABELS[item.stage]}
                      </Badge>
                    </td>
                    <td className="report-number">
                      {formatNumber(item.output_qty)}
                    </td>
                    <td className="report-number">
                      {formatNumber(item.reject_qty)}
                    </td>
                    <td className="report-number">
                      {formatNumber(item.scrap_qty)}
                    </td>
                    <td className="report-number">
                      {formatPercent(item.reject_ratio)}
                    </td>
                    <td className="report-number">
                      {formatPercent(item.scrap_ratio)}
                    </td>
                    <td>
                      <span className="report-log-person">
                        {item.created_by?.name ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span
                        className="report-log-notes"
                        title={item.notes ?? undefined}
                      >
                        {item.notes || "—"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer report-log-footer">
            <span>
              Menampilkan {formatNumber(pageStart)}–{formatNumber(pageEnd)} dari{" "}
              {formatNumber(total)} log
            </span>

            <div className="report-log-footer-actions">
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  onPageSizeChange(Number(value));
                }}
              >
                <SelectTrigger
                  className="report-page-size"
                  aria-label="Jumlah log per halaman"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} per halaman
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {totalPages > 1 && (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={onPageChange}
                />
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
