import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import type { ProductionOrderDetail } from "@/types";

/** Kartu ringkasan: model, pelanggan, PIC, deadline, dan progress tahap. */
export function OrderSummaryCard({ order }: { order: ProductionOrderDetail }) {
  return (
    <section className="order-summary-card">
      <div className="order-summary-head">
        <div>
          <h2>{order.model_summary}</h2>
          <p>
            {order.item_count} model ·{" "}
            {formatNumber(order.total_quantity)} pcs
          </p>
        </div>
        <div className="order-summary-badges">
          <StatusBadge status={order.status} />
          <PriorityBadge priority={order.priority} />
        </div>
      </div>

      <dl className="order-summary-grid">
        <div>
          <dt>Pelanggan</dt>
          <dd>{order.customer?.name ?? "Stok internal"}</dd>
        </div>
        <div>
          <dt>PIC Produksi</dt>
          <dd>{order.pic?.name ?? "Belum ditentukan"}</dd>
        </div>
        <div>
          <dt>Deadline</dt>
          <dd>
            {order.deadline
              ? formatDate(order.deadline, true)
              : "Tanpa deadline"}
          </dd>
        </div>
        <div>
          <dt>Total Quantity</dt>
          <dd>{formatNumber(order.total_quantity)} pcs</dd>
        </div>
        <div className="order-summary-progress">
          <dt>Progress Tahap</dt>
          <dd>
            <Progress
              value={order.progress}
              tone={order.progress >= 100 ? "green" : "orange"}
              label={`Progress ${order.code}`}
            />
            <span>{order.progress}%</span>
          </dd>
        </div>
        <div>
          <dt>Terakhir diperbarui</dt>
          <dd>{formatDateTime(order.updated_at)}</dd>
        </div>
      </dl>

      {order.notes && (
        <div className="order-summary-notes">
          <h3>Catatan</h3>
          <p>{order.notes}</p>
        </div>
      )}
    </section>
  );
}
