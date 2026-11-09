"use client";

import {
  mdiAlertCircleOutline,
  mdiPlus,
} from "@mdi/js";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { ArchiveOrderDialog } from "@/components/orders/archive-order-dialog";
import {
  ALL,
  OrderListToolbar,
  type PriorityFilter,
  type StatusFilter,
} from "@/components/orders/order-list-toolbar";
import { OrderTable } from "@/components/orders/order-table";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { useOrderOptions } from "@/components/orders/use-order-options";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  archiveProductionOrder,
  getProductionOrder,
  listProductionOrders,
} from "@/lib/api";
import { usePaginatedList } from "@/lib/hooks/use-paginated-list";
import { pageRange } from "@/lib/pagination";
import { queryKeys } from "@/lib/query/keys";
import type {
  ProductionOrderDetail,
  ProductionOrderListItem,
} from "@/types";

const PAGE_SIZE = 6;

export function OrderWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const options = useOrderOptions();
  const canWrite = user?.role === "admin" || user?.role === "operator";

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] =
    useState<ProductionOrderDetail | null>(null);
  const [archiveTarget, setArchiveTarget] =
    useState<ProductionOrderListItem | null>(null);
  const [archiving, setArchiving] = useState(false);

  const {
    data,
    items,
    loading,
    error: loadError,
    search,
    setSearch,
    page,
    setPage,
    reload,
  } = usePaginatedList({
    queryKey: queryKeys.orders.list({
      status: statusFilter === ALL ? undefined : statusFilter,
      priority: priorityFilter === ALL ? undefined : priorityFilter,
    }),
    errorMessage: "Daftar perintah produksi gagal dimuat.",
    queryFn: ({ page: pageToLoad, search: searchTerm, signal }) =>
      listProductionOrders(
        {
          page: pageToLoad,
          page_size: PAGE_SIZE,
          search: searchTerm,
          status: statusFilter === ALL ? undefined : statusFilter,
          priority: priorityFilter === ALL ? undefined : priorityFilter,
        },
        { signal },
      ),
  });

  const range = pageRange(data?.page ?? page, PAGE_SIZE, items.length);
  const hasFilter =
    search.trim().length > 0 ||
    statusFilter !== ALL ||
    priorityFilter !== ALL;

  function handleStatusFilterChange(value: StatusFilter) {
    setStatusFilter(value);
    setPage(1);
  }

  function handlePriorityFilterChange(value: PriorityFilter) {
    setPriorityFilter(value);
    setPage(1);
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter(ALL);
    setPriorityFilter(ALL);
    setPage(1);
  }

  function openCreate() {
    setEditingOrder(null);
    setDialogOpen(true);
  }

  async function openEdit(order: ProductionOrderListItem) {
    try {
      const detail = await getProductionOrder(order.id);
      setEditingOrder(detail);
      setDialogOpen(true);
    } catch (error) {
      toast({
        title: "Gagal membuka perintah",
        description:
          error instanceof Error
            ? error.message
            : "Detail perintah produksi gagal dimuat.",
        variant: "error",
      });
    }
  }

  function handleSaved(saved: ProductionOrderDetail, mode: "create" | "edit") {
    setDialogOpen(false);
    setEditingOrder(null);

    if (mode === "create") {
      resetFilters();
      toast({
        title: "Perintah produksi dibuat",
        description: `${saved.code} tersimpan dengan ${saved.item_count} model.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Perintah produksi diperbarui",
        description: `${saved.code} berhasil disimpan.`,
        variant: "success",
      });
    }

    reload();
  }

  async function handleArchive() {
    if (!archiveTarget) {
      return;
    }

    setArchiving(true);

    try {
      await archiveProductionOrder(archiveTarget.id);
      const lastItemOnPage = items.length === 1 && page > 1;
      toast({
        title: "Perintah produksi diarsipkan",
        description: `${archiveTarget.code} tidak lagi tampil di daftar aktif.`,
        variant: "success",
      });
      setArchiveTarget(null);

      if (lastItemOnPage) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        reload();
      }
    } catch (error) {
      toast({
        title: "Gagal mengarsipkan",
        description:
          error instanceof Error
            ? error.message
            : "Perintah produksi gagal diarsipkan.",
        variant: "error",
      });
    } finally {
      setArchiving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Perintah Produksi"
        subtitle="Kelola perintah produksi celana jeans dari cutting sampai selesai."
        actions={
          canWrite ? (
            <Button onClick={openCreate}>
              <Icon path={mdiPlus} size={18} />
              Buat Perintah Produksi
            </Button>
          ) : undefined
        }
      />

      <section className="table-card">
        <OrderListToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={handlePriorityFilterChange}
        />

        {loading ? (
          <TableSkeleton rows={PAGE_SIZE} />
        ) : loadError ? (
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Daftar gagal dimuat"
            description={loadError}
            action={
              <Button variant="secondary" size="sm" onClick={reload}>
                Coba lagi
              </Button>
            }
          />
        ) : items.length > 0 ? (
          <>
            <OrderTable
              orders={items}
              role={user?.role}
              onEdit={(order) => {
                void openEdit(order);
              }}
              onArchive={setArchiveTarget}
            />

            <div className="table-footer">
              <span>
                Menampilkan {range.from}–{range.to} dari {data?.total ?? 0}{" "}
                perintah
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
            title={
              hasFilter
                ? "Perintah produksi tidak ditemukan"
                : "Belum ada perintah produksi"
            }
            description={
              hasFilter
                ? "Coba ubah kata kunci pencarian atau filter yang dipakai."
                : "Perintah produksi yang dibuat akan tampil di sini."
            }
            action={
              hasFilter ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : canWrite ? (
                <Button size="sm" onClick={openCreate}>
                  <Icon path={mdiPlus} size={16} />
                  Buat Perintah Produksi
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      <OrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={editingOrder}
        customers={options.customers}
        products={options.products}
        users={options.users}
        currentUser={user}
        onSaved={handleSaved}
      />

      <ArchiveOrderDialog
        open={Boolean(archiveTarget)}
        order={archiveTarget}
        archiving={archiving}
        onOpenChange={(open) => {
          if (!open && !archiving) {
            setArchiveTarget(null);
          }
        }}
        onConfirm={() => {
          void handleArchive();
        }}
      />
    </>
  );
}
