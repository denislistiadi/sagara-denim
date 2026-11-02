"use client";

import { mdiAlertCircleOutline, mdiFactory } from "@mdi/js";
import { useEffect, useState } from "react";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { QueueCard } from "@/components/queue/queue-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { getProductionQueue } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS, PRIORITY_OPTIONS } from "@/lib/labels";
import { ACTIVE_STATUSES } from "@/lib/workflow";
import type {
  Priority,
  ProductionQueueResponse,
} from "@/types";

const ALL = "semua";

function QueueSkeleton() {
  return (
    <div className="queue-board-scroll" aria-hidden="true">
      <div className="queue-board">
        {ACTIVE_STATUSES.map((status) => (
          <section className="queue-stage" data-stage={status} key={status}>
            <div className="queue-stage-head">
              <div className="queue-stage-title">
                <span className="queue-stage-dot" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
            <div className="queue-stage-body">
              {Array.from({ length: 3 }).map((_, index) => (
                <div className="queue-card queue-card-skeleton" key={index}>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-28" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ProductionQueueBoard() {
  const [data, setData] = useState<ProductionQueueResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<Priority | typeof ALL>(
    ALL,
  );
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const response = await getProductionQueue({
          search: debouncedSearch || undefined,
          priority: priorityFilter === ALL ? undefined : priorityFilter,
        });

        if (active) {
          setData(response);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Antrean produksi gagal dimuat.",
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
  }, [debouncedSearch, priorityFilter, reloadKey]);

  const hasFilter =
    search.trim().length > 0 || priorityFilter !== ALL;

  function resetFilters() {
    setSearch("");
    setDebouncedSearch("");
    setPriorityFilter(ALL);
  }

  return (
    <>
      <PageHeader
        title="Antrean Produksi"
        subtitle={
          data
            ? `${formatNumber(data.total_orders)} perintah aktif · ${formatNumber(
                data.total_quantity,
              )} pcs di lantai produksi.`
            : "Pantau pergerakan perintah di setiap tahap produksi."
        }
      />

      <section className="queue-panel" aria-busy={loading}>
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari kode, model, pelanggan, atau catatan..."
            aria-label="Cari antrean produksi"
            wrapperClassName="table-search"
          />

          <div className="table-toolbar-actions">
            <Select
              value={priorityFilter}
              onValueChange={(value) =>
                setPriorityFilter(value as Priority | typeof ALL)
              }
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter prioritas antrean"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>Semua prioritas</SelectItem>
                {PRIORITY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilter && (
              <Button variant="secondary" size="sm" onClick={resetFilters}>
                Reset filter
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <QueueSkeleton />
        ) : loadError ? (
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Antrean gagal dimuat"
            description={loadError}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReloadKey((current) => current + 1)}
              >
                Coba lagi
              </Button>
            }
          />
        ) : (
          <div className="queue-board-scroll">
            <div className="queue-board">
              {(data?.stages ?? []).map((stage) => (
                <section
                  className="queue-stage"
                  data-stage={stage.status}
                  key={stage.status}
                  aria-labelledby={`queue-stage-${stage.status}`}
                >
                  <header className="queue-stage-head">
                    <div className="queue-stage-title">
                      <span className="queue-stage-dot" aria-hidden="true" />
                      <h2 id={`queue-stage-${stage.status}`}>
                        {ORDER_STATUS_LABELS[stage.status]}
                      </h2>
                    </div>
                    <div className="queue-stage-stats">
                      <span>{formatNumber(stage.order_count)}</span>
                      <small>{formatNumber(stage.total_quantity)} pcs</small>
                    </div>
                  </header>

                  <div className="queue-stage-body">
                    {stage.orders.length > 0 ? (
                      stage.orders.map((order) => (
                        <QueueCard order={order} key={order.id} />
                      ))
                    ) : (
                      <div className="queue-stage-empty">
                        <Icon path={mdiFactory} size={22} />
                        <p>Belum ada perintah di tahap ini.</p>
                      </div>
                    )}

                    {stage.order_count > stage.orders.length && (
                      <p className="queue-stage-more">
                        Menampilkan {stage.orders.length} dari{" "}
                        {formatNumber(stage.order_count)} perintah, diurutkan
                        berdasarkan prioritas dan deadline.
                      </p>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}
