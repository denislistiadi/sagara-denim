import {
  mdiAccountOutline,
  mdiAlertCircleOutline,
  mdiCalendarOutline,
} from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { PriorityBadge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { todayISO } from "@/lib/date";
import { formatDate, formatNumber } from "@/lib/format";
import type { ProductionOrderListItem } from "@/types";

function progressTone(progress: number) {
  if (progress >= 100) return "green" as const;
  if (progress >= 70) return "blue" as const;
  if (progress > 0) return "orange" as const;
  return "amber" as const;
}

export function QueueCard({ order }: { order: ProductionOrderListItem }) {
  const overdue = Boolean(order.deadline && order.deadline < todayISO());

  return (
    <Link
      href={`/perintah-produksi/${order.id}`}
      className="queue-card"
      aria-label={`Buka ${order.code}, ${order.model_summary}`}
    >
      <div className="queue-card-head">
        <span className="code-badge">{order.code}</span>
        <PriorityBadge priority={order.priority} />
      </div>

      <div className="queue-card-model">{order.model_summary}</div>
      <div className="queue-card-customer">
        {order.customer?.name ?? "Stok internal"}
      </div>

      <div className="queue-card-metrics">
        <span>
          <strong>{formatNumber(order.total_quantity)}</strong> pcs
        </span>
        <span>{order.item_count} model</span>
      </div>

      <div className="queue-card-progress">
        <div className="queue-card-progress-label">
          <span>Progress tahap</span>
          <strong>{order.progress}%</strong>
        </div>
        <Progress
          value={order.progress}
          tone={progressTone(order.progress)}
          label={`Progress tahap ${order.code}`}
        />
      </div>

      <div className="queue-card-footer">
        <span
          className={
            overdue
              ? "queue-card-meta queue-card-overdue"
              : "queue-card-meta"
          }
        >
          <Icon
            path={overdue ? mdiAlertCircleOutline : mdiCalendarOutline}
            size={15}
          />
          {order.deadline
            ? `${overdue ? "Terlambat · " : ""}${formatDate(order.deadline, true)}`
            : "Tanpa deadline"}
        </span>

        {order.pic && (
          <span className="queue-card-meta">
            <Icon path={mdiAccountOutline} size={15} />
            {order.pic.name}
          </span>
        )}
      </div>
    </Link>
  );
}
