"use client";

import {
  mdiAlertCircleOutline,
  mdiLayersOutline,
  mdiPlus,
} from "@mdi/js";
import { useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { DeactivateMaterialDialog } from "@/components/materials/deactivate-material-dialog";
import { LowStockBanner } from "@/components/materials/low-stock-banner";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { MaterialSummaryCards } from "@/components/materials/material-summary";
import { MaterialTable } from "@/components/materials/material-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchInput } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  getMaterial,
  listMaterials,
  type MaterialActiveFilter,
} from "@/lib/api";
import { canManageMaterials } from "@/lib/materials";
import { usePaginatedList } from "@/lib/hooks/use-paginated-list";
import { pageRange } from "@/lib/pagination";
import { queryKeys } from "@/lib/query/keys";
import { STOCK_STATUS_OPTIONS } from "@/lib/labels";
import type {
  MaterialDetail,
  MaterialSummary,
  StockStatus,
} from "@/types";

const PAGE_SIZE = 10;
const ALL = "semua";

export function MaterialWorkspace() {
  const { user } = useAuth();
  const { toast } = useToast();
  const canManage = canManageMaterials(user?.role);

  const [categoryFilter, setCategoryFilter] = useState(ALL);
  const [stockStatusFilter, setStockStatusFilter] = useState<
    StockStatus | typeof ALL
  >(ALL);
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [activeFilter, setActiveFilter] =
    useState<MaterialActiveFilter>("aktif");
  const [formOpen, setFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] =
    useState<MaterialDetail | null>(null);
  const [statusTarget, setStatusTarget] = useState<MaterialSummary | null>(null);

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
    queryKey: queryKeys.materials.list({
      active: activeFilter,
      category: categoryFilter === ALL ? undefined : categoryFilter,
      stockStatus:
        stockStatusFilter === ALL ? undefined : stockStatusFilter,
      lowStock: lowStockFilter || undefined,
    }),
    errorMessage: "Daftar bahan gagal dimuat.",
    queryFn: ({ page: pageToLoad, search: searchTerm, signal }) =>
      listMaterials(
        {
          page: pageToLoad,
          page_size: PAGE_SIZE,
          search: searchTerm,
          category: categoryFilter === ALL ? undefined : categoryFilter,
          stock_status:
            stockStatusFilter === ALL ? undefined : stockStatusFilter,
          low_stock: lowStockFilter || undefined,
          active: activeFilter,
        },
        { signal },
      ),
  });

  const summary = data?.summary;
  const range = pageRange(data?.page ?? page, PAGE_SIZE, items.length);
  const restockCount = summary
    ? summary.out_of_stock + summary.below_minimum
    : 0;
  const hasFilter =
    search.trim().length > 0 ||
    categoryFilter !== ALL ||
    stockStatusFilter !== ALL ||
    lowStockFilter ||
    activeFilter !== "aktif";

  function resetFilters() {
    setSearch("");
    setCategoryFilter(ALL);
    setStockStatusFilter(ALL);
    setLowStockFilter(false);
    setActiveFilter("aktif");
    setPage(1);
  }

  function showLowStock() {
    setSearch("");
    setCategoryFilter(ALL);
    setStockStatusFilter(ALL);
    setLowStockFilter(true);
    setActiveFilter("aktif");
    setPage(1);
  }

  function openCreate() {
    setEditingMaterial(null);
    setFormOpen(true);
  }

  async function openEdit(material: MaterialSummary) {
    try {
      const detail = await getMaterial(material.id);
      setEditingMaterial(detail);
      setFormOpen(true);
    } catch (error) {
      toast({
        title: "Gagal membuka bahan",
        description:
          error instanceof Error
            ? error.message
            : "Detail bahan gagal dimuat.",
        variant: "error",
      });
    }
  }

  function handleSaved(saved: MaterialDetail, mode: "create" | "edit") {
    setFormOpen(false);
    setEditingMaterial(null);

    if (mode === "create") {
      resetFilters();
      toast({
        title: "Bahan ditambahkan",
        description: `${saved.sku} tersimpan dengan stok ${saved.stock_qty} ${saved.unit}.`,
        variant: "success",
      });
    } else {
      toast({
        title: "Bahan diperbarui",
        description: `${saved.sku} berhasil disimpan.`,
        variant: "success",
      });
    }

    reload();
  }

  function handleStatusChanged(saved: MaterialDetail) {
    const wasActivating = saved.is_active;
    setStatusTarget(null);
    toast({
      title: wasActivating ? "Bahan diaktifkan" : "Bahan dinonaktifkan",
      description: wasActivating
        ? `${saved.sku} dapat menerima mutasi stok kembali.`
        : `${saved.sku} tidak dapat menerima mutasi sampai diaktifkan kembali.`,
      variant: "success",
    });
    reload();
  }

  return (
    <>
      <PageHeader
        title="Bahan & Aksesoris"
        subtitle="Kelola stok kain, benang, kancing, dan aksesoris produksi."
        actions={
          canManage ? (
            <Button onClick={openCreate}>
              <Icon path={mdiPlus} size={18} />
              Tambah Bahan
            </Button>
          ) : undefined
        }
      />

      {summary && <MaterialSummaryCards summary={summary} />}

      <LowStockBanner count={restockCount} onShowLowStock={showLowStock} />

      <section className="table-card materials-panel">
        <div className="table-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari SKU, nama, atau kategori..."
            aria-label="Cari bahan"
            wrapperClassName="table-search"
          />

          <div className="table-toolbar-actions">
            <Select
              value={categoryFilter}
              onValueChange={(value) => {
                setCategoryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter kategori"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>Semua kategori</SelectItem>
                {(summary?.categories ?? []).map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={stockStatusFilter}
              onValueChange={(value) => {
                setStockStatusFilter(value as StockStatus | typeof ALL);
                setPage(1);
              }}
            >
              <SelectTrigger className="table-filter" aria-label="Filter status stok">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>Semua status stok</SelectItem>
                {STOCK_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={lowStockFilter ? "restock" : ALL}
              onValueChange={(value) => {
                setLowStockFilter(value === "restock");
                setPage(1);
              }}
            >
              <SelectTrigger
                className="table-filter"
                aria-label="Filter kebutuhan restock"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value={ALL}>Semua kondisi</SelectItem>
                <SelectItem value="restock">Perlu restock</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={activeFilter}
              onValueChange={(value) => {
                setActiveFilter(value as MaterialActiveFilter);
                setPage(1);
              }}
            >
              <SelectTrigger className="table-filter" aria-label="Filter status bahan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end">
                <SelectItem value="aktif">Bahan aktif</SelectItem>
                <SelectItem value="nonaktif">Bahan nonaktif</SelectItem>
                <SelectItem value="semua">Semua bahan</SelectItem>
              </SelectContent>
            </Select>

            {hasFilter && (
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                Reset filter
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={PAGE_SIZE} />
        ) : loadError ? (
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Daftar bahan gagal dimuat"
            description={loadError}
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={reload}
              >
                Coba lagi
              </Button>
            }
          />
        ) : items.length > 0 ? (
          <>
            <MaterialTable
              materials={items}
              role={user?.role}
              onEdit={(material) => {
                void openEdit(material);
              }}
              onToggleActive={setStatusTarget}
            />

            <div className="table-footer">
              <span>
                Menampilkan {range.from}–{range.to} dari {data?.total ?? 0}{" "}
                bahan
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
            icon={mdiLayersOutline}
            title={
              hasFilter ? "Bahan tidak ditemukan" : "Belum ada bahan terdaftar"
            }
            description={
              hasFilter
                ? "Coba ubah kata kunci atau filter yang dipakai."
                : "Tambahkan bahan dan aksesoris agar stok produksi dapat dipantau."
            }
            action={
              hasFilter ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filter
                </Button>
              ) : canManage ? (
                <Button size="sm" onClick={openCreate}>
                  <Icon path={mdiPlus} size={16} />
                  Tambah Bahan
                </Button>
              ) : undefined
            }
          />
        )}
      </section>

      {formOpen && (
        <MaterialFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          material={editingMaterial}
          categories={summary?.categories ?? []}
          onSaved={handleSaved}
        />
      )}

      {statusTarget && (
        <DeactivateMaterialDialog
          material={statusTarget}
          onOpenChange={(open) => {
            if (!open) {
              setStatusTarget(null);
            }
          }}
          onCompleted={handleStatusChanged}
        />
      )}
    </>
  );
}
