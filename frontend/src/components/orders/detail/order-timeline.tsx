import { formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import type { OrderStatusHistoryEntry } from "@/types";

/** Timeline perubahan status perintah produksi. */
export function OrderTimeline({
  history,
}: {
  history: OrderStatusHistoryEntry[];
}) {
  return (
    <section className="order-panel">
      <div className="order-panel-head">
        <div>
          <h2>Timeline Status</h2>
          <p>Riwayat perubahan status, alasan, dan waktu setiap tahap.</p>
        </div>
      </div>
      <ol className="order-timeline">
        {history.map((entry) => (
          <li key={entry.id} className="order-timeline-item">
            <span className="order-timeline-dot" aria-hidden="true" />
            <div className="order-timeline-content">
              <div className="order-timeline-title">
                {entry.from_status ? (
                  <>
                    {ORDER_STATUS_LABELS[entry.from_status]}
                    <span aria-hidden="true"> → </span>
                  </>
                ) : (
                  "Dibuat sebagai "
                )}
                <strong>{ORDER_STATUS_LABELS[entry.to_status]}</strong>
              </div>
              <div className="order-timeline-meta">
                {entry.changed_by?.name ?? "Sistem"} ·{" "}
                {formatDateTime(entry.created_at)}
              </div>
              {entry.notes && (
                <p className="order-timeline-notes">{entry.notes}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
