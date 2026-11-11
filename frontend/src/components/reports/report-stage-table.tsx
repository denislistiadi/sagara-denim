import { mdiChartTimelineVariant } from "@mdi/js";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  PRODUCTION_STAGE_LABELS,
  PRODUCTION_STAGE_TONE,
} from "@/lib/labels";
import type { ProductionReportStage } from "@/types";

interface ReportStageTableProps {
  rows: ProductionReportStage[];
  loading: boolean;
}

export function ReportStageTable({ rows, loading }: ReportStageTableProps) {
  return (
    <section className="table-card report-panel" aria-label="Rekap tahap">
      <div className="table-toolbar report-panel-head">
        <div>
          <h2 className="report-panel-title">Rekap Tahap</h2>
          <p className="report-panel-subtitle">
            Empat tahap produksi mengikuti urutan tetap.
          </p>
        </div>
        <Badge tone="neutral">4 tahap</Badge>
      </div>

      {loading && rows.length === 0 ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <div className="report-empty">
          <EmptyState
            icon={mdiChartTimelineVariant}
            title="Belum ada rekap tahap"
            description="Tidak ada log produksi pada periode yang dipilih."
          />
        </div>
      ) : (
        <div className="report-table-wrap" aria-busy={loading || undefined}>
          <table className="ds-table report-table report-stage-table">
            <caption className="sr-only">
              Rekap output, reject, dan scrap produksi per tahap
            </caption>
            <thead>
              <tr>
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
                <th scope="col" className="report-number">
                  Log
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.stage}>
                  <td>
                    <Badge tone={PRODUCTION_STAGE_TONE[row.stage]}>
                      {PRODUCTION_STAGE_LABELS[row.stage]}
                    </Badge>
                  </td>
                  <td className="report-number">
                    {formatNumber(row.output_qty)}
                  </td>
                  <td className="report-number">
                    {formatNumber(row.reject_qty)}
                  </td>
                  <td className="report-number">
                    {formatNumber(row.scrap_qty)}
                  </td>
                  <td className="report-number">
                    {formatPercent(row.reject_ratio)}
                  </td>
                  <td className="report-number">
                    {formatPercent(row.scrap_ratio)}
                  </td>
                  <td className="report-number">
                    {formatNumber(row.logs_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
