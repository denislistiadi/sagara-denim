"use client";

import {
  mdiAlertCircleOutline,
  mdiArrowLeft,
  mdiLayersOutline,
  mdiPencilOutline,
  mdiPowerPlugOffOutline,
  mdiPowerPlugOutline,
} from "@mdi/js";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { DeactivateMaterialDialog } from "@/components/materials/deactivate-material-dialog";
import { MaterialFormDialog } from "@/components/materials/material-form-dialog";
import { StockHero } from "@/components/materials/stock-hero";
import { StockMovementDialog } from "@/components/materials/stock-movement-dialog";
import { StockMovementHistory } from "@/components/materials/stock-movement-history";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { ApiError, getMaterial } from "@/lib/api";
import { formatDateTime, formatQuantity } from "@/lib/format";
import { STOCK_MOVEMENT_LABELS } from "@/lib/labels";
import { canManageMaterials } from "@/lib/materials";
import type {
  MaterialDetail,
  StockMovement,
  StockMovementType,
} from "@/types";

export function MaterialDetailScreen() {
  const params = useParams<{ id: string }>();
  const materialId = params.id;
  const { user } = useAuth();
  const { toast } = useToast();

  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [movementType, setMovementType] = useState<StockMovementType | null>(
    null,
  );

  const canManage = canManageMaterials(user?.role);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setNotFound(false);

      try {
        const detail = await getMaterial(materialId);
        if (active) {
          setMaterial(detail);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        if (error instanceof ApiError && error.status === 404) {
          setNotFound(true);
        } else {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Detail bahan gagal dimuat.",
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
  }, [materialId, reloadKey]);

  function handleSaved(saved: MaterialDetail) {
    setMaterial(saved);
    setFormOpen(false);
    toast({
      title: "Bahan diperbarui",
      description: `${saved.sku} berhasil disimpan. Saldo stok tidak berubah.`,
      variant: "success",
    });
  }

  function handleStatusChanged(saved: MaterialDetail) {
    setMaterial(saved);
    setStatusOpen(false);
    toast({
      title: saved.is_active ? "Bahan diaktifkan" : "Bahan dinonaktifkan",
      description: saved.is_active
        ? `${saved.sku} dapat menerima mutasi stok kembali.`
        : `${saved.sku} tidak dapat menerima mutasi sampai diaktifkan kembali.`,
      variant: "success",
    });
  }

  function handleMovementSaved(movement: StockMovement) {
    setMovementType(null);
    toast({
      title: "Mutasi stok tercatat",
      description: `${STOCK_MOVEMENT_LABELS[movement.movement_type]} ${formatQuantity(
        movement.quantity,
      )} ${material?.unit ?? ""} · saldo ${formatQuantity(
        movement.stock_after ?? "0",
      )} ${material?.unit ?? ""}.`,
      variant: "success",
    });
    setReloadKey((current) => current + 1);
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Detail Bahan"
          subtitle="Memuat data bahan dan riwayat stok..."
        />
        <section className="table-card">
          <TableSkeleton rows={5} />
        </section>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PageHeader
          title="Detail Bahan"
          subtitle="Data yang Anda cari tidak tersedia."
        />
        <section className="table-card">
          <EmptyState
            icon={mdiLayersOutline}
            title="Bahan tidak ditemukan"
            description="Bahan mungkin sudah tidak tersedia atau tautannya tidak lagi valid."
            action={
              <Link href="/bahan" className="ds-btn ds-btn-secondary ds-btn-sm">
                <Icon path={mdiArrowLeft} size={16} />
                Kembali ke daftar
              </Link>
            }
          />
        </section>
      </>
    );
  }

  if (loadError || !material) {
    return (
      <>
        <PageHeader
          title="Detail Bahan"
          subtitle="Detail bahan gagal dimuat."
        />
        <section className="table-card">
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Data bahan gagal dimuat"
            description={loadError ?? "Terjadi kesalahan yang tidak diketahui."}
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
        </section>
      </>
    );
  }

  return (
    <>
      <Link href="/bahan" className="back-link">
        <Icon path={mdiArrowLeft} size={16} />
        Kembali ke Bahan &amp; Aksesoris
      </Link>

      <PageHeader
        title={material.name}
        subtitle={`${material.sku} · ${material.category}`}
        actions={
          canManage ? (
            <div className="material-detail-actions">
              <Button
                variant="secondary"
                onClick={() => setFormOpen(true)}
              >
                <Icon path={mdiPencilOutline} size={17} />
                Ubah Bahan
              </Button>
              <Button
                variant={material.is_active ? "danger" : "primary"}
                onClick={() => setStatusOpen(true)}
              >
                <Icon
                  path={
                    material.is_active
                      ? mdiPowerPlugOffOutline
                      : mdiPowerPlugOutline
                  }
                  size={17}
                />
                {material.is_active ? "Nonaktifkan" : "Aktifkan"}
              </Button>
            </div>
          ) : undefined
        }
      />

      {!material.is_active && (
        <section className="material-inactive-banner" role="status">
          <span className="material-inactive-icon" aria-hidden="true">
            <Icon path={mdiPowerPlugOffOutline} size={22} />
          </span>
          <div className="material-inactive-copy">
            <strong>Bahan ini nonaktif</strong>
            <p>
              Saldo {formatQuantity(material.stock_qty)} {material.unit} dan
              seluruh riwayatnya tetap tersimpan, tetapi bahan tidak dapat
              menerima mutasi stok baru.
              {canManage
                ? " Aktifkan kembali untuk melanjutkan pencatatan stok."
                : ""}
            </p>
          </div>
        </section>
      )}

      <StockHero
        material={material}
        role={user?.role}
        onOpenMovement={setMovementType}
      />

      <section className="material-info-card">
        <div className="material-panel-head">
          <div>
            <h2>Informasi Master</h2>
            <p>Data referensi bahan yang dipakai di seluruh modul produksi.</p>
          </div>
        </div>
        <dl className="material-info-grid">
          <div>
            <dt>SKU</dt>
            <dd>
              <span className="code-badge">{material.sku}</span>
            </dd>
          </div>
          <div>
            <dt>Kategori</dt>
            <dd>{material.category}</dd>
          </div>
          <div>
            <dt>Satuan</dt>
            <dd>{material.unit}</dd>
          </div>
          <div>
            <dt>Tanggal dibuat</dt>
            <dd>{formatDateTime(material.created_at)}</dd>
          </div>
        </dl>
      </section>

      <StockMovementHistory
        materialId={material.id}
        unit={material.unit}
        reloadKey={reloadKey}
      />

      {formOpen && (
        <MaterialFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          material={material}
          categories={[material.category]}
          onSaved={handleSaved}
        />
      )}

      {statusOpen && (
        <DeactivateMaterialDialog
          material={material}
          onOpenChange={setStatusOpen}
          onCompleted={handleStatusChanged}
        />
      )}

      {movementType && (
        <StockMovementDialog
          material={material}
          initialType={movementType}
          role={user?.role}
          onOpenChange={(open) => {
            if (!open) {
              setMovementType(null);
            }
          }}
          onSaved={handleMovementSaved}
        />
      )}
    </>
  );
}
