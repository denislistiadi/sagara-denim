"use client";

import {
  mdiArchiveOutline,
  mdiDotsHorizontal,
  mdiEyeOutline,
  mdiPencilOutline,
} from "@mdi/js";
import Link from "next/link";
import { Icon } from "@/components/icon";
import { Avatar } from "@/components/ui/avatar";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatNumber } from "@/lib/format";
import { canArchiveOrder, canEditOrder } from "@/lib/workflow";
import type { ProductionOrderListItem, UserRole } from "@/types";

function progressTone(progress: number) {
  if (progress >= 100) return "green" as const;
  if (progress >= 70) return "blue" as const;
  if (progress > 0) return "orange" as const;
  return "amber" as const;
}

interface OrderTableProps {
  orders: ProductionOrderListItem[];
  role: UserRole | undefined;
  onEdit: (order: ProductionOrderListItem) => void;
  onArchive: (order: ProductionOrderListItem) => void;
}

/** Tabel utama daftar perintah produksi. */
export function OrderTable({
  orders,
  role,
  onEdit,
  onArchive,
}: OrderTableProps) {
  return (
    <div className="table-scroll">
      <table className="ds-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Model</th>
            <th>Pelanggan</th>
            <th>Jumlah</th>
            <th>Status</th>
            <th>Progress</th>
            <th>Deadline</th>
            <th>PIC</th>
            <th scope="col" aria-label="Aksi" />
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td>
                <span className="code-badge">{order.code}</span>
              </td>
              <td>
                <Link
                  href={`/perintah-produksi/${order.id}`}
                  className="table-primary table-primary-link"
                >
                  {order.model_summary}
                </Link>
                <div className="table-secondary table-secondary-inline">
                  <span>{order.item_count} model</span>
                  <PriorityBadge priority={order.priority} />
                </div>
              </td>
              <td>
                <div className="table-primary table-primary-muted">
                  {order.customer?.name ?? "Stok internal"}
                </div>
                {order.customer && (
                  <div className="table-secondary">{order.customer.code}</div>
                )}
              </td>
              <td>
                <span className="table-number">
                  {formatNumber(order.total_quantity)}
                </span>{" "}
                <span className="table-unit">pcs</span>
              </td>
              <td>
                <StatusBadge status={order.status} />
              </td>
              <td>
                <div className="table-progress">
                  <Progress
                    value={order.progress}
                    tone={progressTone(order.progress)}
                    label={`Progress ${order.code}`}
                  />
                  <span>{order.progress}%</span>
                </div>
              </td>
              <td>
                <span className="table-date">
                  {order.deadline
                    ? formatDate(order.deadline, true)
                    : "—"}
                </span>
              </td>
              <td>
                {order.pic ? (
                  <span className="table-pic">
                    <Avatar name={order.pic.name} size="sm" tone="light" />
                    {order.pic.name}
                  </span>
                ) : (
                  <span className="table-muted">Belum ditentukan</span>
                )}
              </td>
              <td>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="table-action-btn"
                      aria-label={`Aksi untuk ${order.code}`}
                    >
                      <Icon path={mdiDotsHorizontal} size={19} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link
                        href={`/perintah-produksi/${order.id}`}
                        className="ds-dropdown-item"
                      >
                        <Icon path={mdiEyeOutline} size={17} />
                        Lihat detail
                      </Link>
                    </DropdownMenuItem>

                    {canEditOrder(order, role) && (
                      <DropdownMenuItem onSelect={() => onEdit(order)}>
                        <Icon path={mdiPencilOutline} size={17} />
                        Ubah perintah
                      </DropdownMenuItem>
                    )}

                    {canArchiveOrder(order, role) && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem danger onSelect={() => onArchive(order)}>
                          <Icon path={mdiArchiveOutline} size={17} />
                          Arsipkan
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
