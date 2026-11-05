import { formatDate, formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import type { ProductionLogEntry } from "@/types";

/** Tabel log output dan reject produksi per tahap. */
export function OrderLogsTable({ logs }: { logs: ProductionLogEntry[] }) {
  return (
    <section className="order-panel">
      <div className="order-panel-head">
        <div>
          <h2>Log Produksi</h2>
          <p>Output dan reject per tahap, langsung tampil setelah disimpan.</p>
        </div>
      </div>
      {logs.length > 0 ? (
        <div className="table-scroll">
          <table className="ds-table order-log-table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Tahap</th>
                <th>Output</th>
                <th>Reject</th>
                <th>Oleh</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <span className="table-date">
                      {formatDate(log.log_date, true)}
                    </span>
                  </td>
                  <td>{ORDER_STATUS_LABELS[log.stage]}</td>
                  <td>
                    <span className="table-number">
                      {formatNumber(log.output_qty)}
                    </span>{" "}
                    <span className="table-unit">pcs</span>
                  </td>
                  <td>
                    {formatNumber(log.reject_qty)}{" "}
                    <span className="table-unit">pcs</span>
                  </td>
                  <td>{log.created_by?.name ?? "Sistem"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="order-empty-note">
          Belum ada log produksi untuk perintah ini.
        </p>
      )}
    </section>
  );
}
