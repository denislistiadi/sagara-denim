import { mdiCalendarBlankOutline } from "@mdi/js";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import type { ProductionReportDaily } from "@/types";

interface ReportDailyTableProps {
  rows: ProductionReportDaily[];
  loading: boolean;
}

function totalRatio(output: number, reject: number): number {
  const total = output + reject;
  return total === 0 ? 0 : Math.round((reject * 10000) / total) / 100;
}

export function ReportDailyTable({ rows, loading }: ReportDailyTableProps) {
  const output = rows.reduce((sum, row) => sum + row.output_qty, 0);
  const reject = rows.reduce((sum, row) => sum + row.reject_qty, 0);
  const logs = rows.reduce((sum, row) => sum + row.logs_count, 0);

  return (
    <section className="table-card report-panel" aria-label="Rekap harian">
      <div className="table-toolbar report-panel-head">
        <div>
          <h2 className="report-panel-title">Rekap Harian</h2>
          <p className="report-panel-subtitle">
            Hanya tanggal yang memiliki log produksi.
          </p>
        </div>
        <Badge tone="neutral">{formatNumber(rows.length)} hari</Badge>
      </div>

      {loading && rows.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <div className="report-empty">
          <EmptyState
            icon={mdiCalendarBlankOutline}
            title="Belum ada rekap harian"
            description="Tidak ada log produksi pada periode dan tahap yang dipilih."
          />
        </div>
      ) : (
        <div className="report-table-wrap" aria-busy={loading || undefined}>
          <table className="ds-table report-table report-daily-table">
            <caption className="sr-only">
              Rekap output dan reject produksi per tanggal log
            </caption>
            <thead>
              <tr>
                <th scope="col">Tanggal</th>
                <th scope="col" className="report-number">
                  Output
                </th>
                <th scope="col" className="report-number">
                  Reject
                </th>
                <th scope="col" className="report-number">
                  Rasio
                </th>
                <th scope="col" className="report-number">
                  Log
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date}>
                  <td>
                    <span className="table-date">
                      {formatDate(row.date, true)}
                    </span>
                  </td>
                  <td className="report-number">
                    {formatNumber(row.output_qty)}
                  </td>
                  <td className="report-number">
                    {formatNumber(row.reject_qty)}
                  </td>
                  <td className="report-number">
                    {formatPercent(row.reject_ratio)}
                  </td>
                  <td className="report-number">
                    {formatNumber(row.logs_count)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="report-table-total">
                <td>Total</td>
                <td className="report-number">{formatNumber(output)}</td>
                <td className="report-number">{formatNumber(reject)}</td>
                <td className="report-number">
                  {formatPercent(totalRatio(output, reject))}
                </td>
                <td className="report-number">{formatNumber(logs)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
