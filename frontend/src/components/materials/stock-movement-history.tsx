"use client";

import {
  mdiAlertCircleOutline,
  mdiHistory,
  mdiOpenInNew,
} from "@mdi/js";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { listMaterialMovements } from "@/lib/api";
import { formatDateTime, formatQuantity } from "@/lib/format";
import {
  STOCK_MOVEMENT_LABELS,
  STOCK_MOVEMENT_OPTIONS,
} from "@/lib/labels";
import type {
  StockMovement,
  StockMovementListResponse,
  StockMovementType,
} from "@/types";

const PAGE_SIZE = 8;
const ALL = "semua";

const MOVEMENT_TONE: Record<StockMovementType, BadgeTone> = {
  masuk: "green",
  keluar: "orange",
  penyesuaian: "blue",
};

const MOVEMENT_SIGN: Record<StockMovementType, string> = {
  masuk: "+",
  keluar: "−",
  penyesuaian: "",
};

interface StockMovementHistoryProps {
  materialId: string;
  unit: string;
  reloadKey: number;
}

function quantityLabel(movement: StockMovement, unit: string): string {
  const sign = MOVEMENT_SIGN[movement.movement_type];
  const amount = formatQuantity(movement.quantity);

  return `${sign}${amount} ${unit}`.trim();
}

function balanceLabel(movement: StockMovement, unit: string): string {
  if (movement.stock_before === null || movement.stock_after === null) {
    return "—";
  }

  return `${formatQuantity(movement.stock_before)} → ${formatQuantity(
    movement.stock_after,
  )} ${unit}`;
}

export function StockMovementHistory({
  materialId,
  unit,
  reloadKey,
}: StockMovementHistoryProps) {
  const [data, setData] = useState<StockMovementListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [movementType, setMovementType] = useState<StockMovementType | typeof ALL>(
    ALL,
  );
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await listMaterialMovements(materialId, {
          page,
          page_size: PAGE_SIZE,
          movement_type: movementType === ALL ? undefined : movementType,
        });

        if (!active) {
          return;
        }

        setData(response);

        if (response.total_pages > 0 && page > response.total_pages) {
          setPage(response.total_pages);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Riwayat mutasi gagal dimuat.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [materialId, movementType, page, reload, reloadKey]);

  const items = data?.items ?? [];
  const hasFilter = movementType !== ALL;

  return (
    <section className="material-detail-panel">
      <div className="material-panel-head">
        <div>
          <h2>Riwayat Mutasi Stok</h2>
          <p>
            Catatan permanen setiap perubahan saldo. Riwayat tidak dapat diubah
            atau dihapus.
          </p>
        </div>

        <Select
          value={movementType}
          onValueChange={(value) => {
            setMovementType(value as StockMovementType | typeof ALL);
            setPage(1);
          }}
        >
          <SelectTrigger
            className="material-history-filter"
            aria-label="Filter tipe mutasi"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value={ALL}>Semua tipe</SelectItem>
            {STOCK_MOVEMENT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <TableSkeleton rows={PAGE_SIZE} />
      ) : loadError ? (
        <EmptyState
          icon={mdiAlertCircleOutline}
          title="Riwayat mutasi gagal dimuat"
          description={loadError}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setReload((current) => current + 1)}
            >
              Coba lagi
            </Button>
          }
        />
      ) : items.length > 0 ? (
        <>
          <div className="table-scroll">
            <table className="ds-table material-history-table">
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Tipe</th>
                  <th>Jumlah</th>
                  <th>Saldo</th>
                  <th>Perintah Produksi</th>
                  <th>Catatan</th>
                  <th>Dicatat Oleh</th>
                </tr>
              </thead>
              <tbody>
                {items.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <span className="table-date">
                        {formatDateTime(movement.created_at)}
                      </span>
                    </td>
                    <td>
                      <Badge tone={MOVEMENT_TONE[movement.movement_type]}>
                        {STOCK_MOVEMENT_LABELS[movement.movement_type]}
                      </Badge>
                    </td>
                    <td>
                      <span
                        className={`table-number material-movement-qty material-movement-${movement.movement_type}`}
                      >
                        {quantityLabel(movement, unit)}
                      </span>
                    </td>
                    <td>
                      <span className="material-movement-balance">
                        {balanceLabel(movement, unit)}
                      </span>
                    </td>
                    <td>
                      {movement.production_order ? (
                        <Link
                          href={`/perintah-produksi/${movement.production_order.id}`}
                          className="material-order-link"
                        >
                          {movement.production_order.code}
                          <Icon path={mdiOpenInNew} size={13} />
                        </Link>
                      ) : (
                        <span className="table-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className="material-movement-note">
                        {movement.note ?? "—"}
                      </span>
                    </td>
                    <td>
                      <span className="table-secondary">
                        {movement.created_by?.name ?? "Sistem"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="table-footer">
            <span>
              Menampilkan {(data?.page ?? 1) * PAGE_SIZE - PAGE_SIZE + 1}–
              {(data?.page ?? 1) * PAGE_SIZE - PAGE_SIZE + items.length} dari{" "}
              {data?.total ?? 0} mutasi
            </span>
            <Pagination
              page={data?.page ?? page}
              totalPages={data?.total_pages ?? 0}
              onPageChange={setPage}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon={mdiHistory}
          title={
            hasFilter
              ? "Tidak ada mutasi dengan tipe ini"
              : "Belum ada mutasi stok"
          }
          description={
            hasFilter
              ? "Coba pilih tipe mutasi lain atau tampilkan semua riwayat."
              : "Setiap stok masuk, stok keluar, dan penyesuaian akan muncul di sini."
          }
          action={
            hasFilter ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setMovementType(ALL);
                  setPage(1);
                }}
              >
                Tampilkan semua
              </Button>
            ) : undefined
          }
        />
      )}
    </section>
  );
}
