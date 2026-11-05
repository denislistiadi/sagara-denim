"use client";

import {
  mdiAlertCircleOutline,
  mdiArrowLeft,
} from "@mdi/js";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { ArchiveOrderDialog } from "@/components/orders/archive-order-dialog";
import { OrderItemsTable } from "@/components/orders/detail/order-items-table";
import { OrderLogsTable } from "@/components/orders/detail/order-logs-table";
import { OrderSummaryCard } from "@/components/orders/detail/order-summary-card";
import { OrderTimeline } from "@/components/orders/detail/order-timeline";
import { OrderDetailHeader } from "@/components/orders/detail/order-detail-header";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrderWorkflowActions } from "@/components/orders/order-workflow-actions";
import { ProductionLogDialog } from "@/components/orders/production-log-dialog";
import { StatusTransitionDialog } from "@/components/orders/status-transition-dialog";
import { WorkflowStepper } from "@/components/orders/workflow-stepper";
import { useOrderOptions } from "@/components/orders/use-order-options";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  archiveProductionOrder,
  getProductionOrder,
} from "@/lib/api";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import type { WorkflowAction } from "@/lib/workflow";
import type { ProductionOrderDetail } from "@/types";

/** Layar detail perintah produksi: data, aksi workflow, dan komposisi panel. */
export function OrderDetailScreen() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const options = useOrderOptions();

  const [order, setOrder] = useState<ProductionOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [transitionAction, setTransitionAction] =
    useState<WorkflowAction | null>(null);
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setLoadError(null);
      setNotFound(false);

      try {
        const detail = await getProductionOrder(orderId);
        if (active) {
          setOrder(detail);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        if (
          error instanceof Error &&
          "status" in error &&
          (error as { status?: number }).status === 404
        ) {
          setNotFound(true);
        } else {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Detail perintah produksi gagal dimuat.",
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
  }, [orderId, reloadKey]);

  function handleSaved(saved: ProductionOrderDetail) {
    setOrder(saved);
    setDialogOpen(false);
    toast({
      title: "Perintah produksi diperbarui",
      description: `${saved.code} berhasil disimpan.`,
      variant: "success",
    });
  }

  function handleTransitionSuccess(saved: ProductionOrderDetail) {
    setOrder(saved);
    setTransitionAction(null);
    toast({
      title: "Status produksi diperbarui",
      description: `${saved.code} sekarang berada di tahap ${
        ORDER_STATUS_LABELS[saved.status]
      }.`,
      variant: "success",
    });
  }

  function handleLogSuccess(saved: ProductionOrderDetail) {
    setOrder(saved);
    setLogOpen(false);
    toast({
      title: "Log produksi dicatat",
      description: `${saved.code} berhasil diperbarui.`,
      variant: "success",
    });
  }

  function handleConflict(message: string) {
    setTransitionAction(null);
    setLogOpen(false);
    toast({
      title: "Data sudah berubah",
      description: message,
      variant: "error",
    });
    setReloadKey((current) => current + 1);
  }

  async function handleArchive() {
    if (!order) {
      return;
    }

    setArchiving(true);

    try {
      await archiveProductionOrder(order.id);
      toast({
        title: "Perintah produksi diarsipkan",
        description: `${order.code} tidak lagi tampil di daftar aktif.`,
        variant: "success",
      });
      router.push("/perintah-produksi");
    } catch (error) {
      toast({
        title: "Gagal mengarsipkan",
        description:
          error instanceof Error
            ? error.message
            : "Perintah produksi gagal diarsipkan.",
        variant: "error",
      });
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Detail Perintah Produksi"
          subtitle="Memuat data perintah produksi..."
        />
        <div className="table-card">
          <TableSkeleton rows={5} />
        </div>
      </>
    );
  }

  if (notFound) {
    return (
      <>
        <PageHeader
          title="Detail Perintah Produksi"
          subtitle="Data yang Anda cari tidak tersedia."
        />
        <section className="table-card">
          <EmptyState
            title="Perintah produksi tidak ditemukan"
            description="Perintah mungkin sudah diarsipkan atau tautannya tidak lagi valid."
            action={
              <Link
                href="/perintah-produksi"
                className="ds-btn ds-btn-secondary ds-btn-sm"
              >
                <Icon path={mdiArrowLeft} size={16} />
                Kembali ke daftar
              </Link>
            }
          />
        </section>
      </>
    );
  }

  if (loadError || !order) {
    return (
      <>
        <PageHeader
          title="Detail Perintah Produksi"
          subtitle="Data belum dapat ditampilkan."
        />
        <section className="table-card">
          <EmptyState
            icon={mdiAlertCircleOutline}
            title="Detail gagal dimuat"
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
      <OrderDetailHeader order={order} />
      <OrderSummaryCard order={order} />
      <WorkflowStepper order={order} />
      <OrderWorkflowActions
        order={order}
        role={user?.role}
        onTransition={setTransitionAction}
        onLog={() => setLogOpen(true)}
        onEdit={() => setDialogOpen(true)}
        onArchive={() => setArchiveOpen(true)}
      />
      <OrderItemsTable items={order.items} />

      <div className="order-detail-grid">
        <OrderTimeline history={order.status_history} />
        <OrderLogsTable logs={order.production_logs} />
      </div>

      {transitionAction && (
        <StatusTransitionDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setTransitionAction(null);
            }
          }}
          order={order}
          action={transitionAction}
          onSuccess={handleTransitionSuccess}
          onConflict={handleConflict}
        />
      )}

      {logOpen && (
        <ProductionLogDialog
          open
          onOpenChange={setLogOpen}
          order={order}
          onSuccess={handleLogSuccess}
          onConflict={handleConflict}
        />
      )}

      <OrderFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        order={order}
        customers={options.customers}
        products={options.products}
        users={options.users}
        currentUser={user}
        onSaved={handleSaved}
      />

      <ArchiveOrderDialog
        open={archiveOpen}
        order={order}
        archiving={archiving}
        onOpenChange={setArchiveOpen}
        description={`${order.code} akan disembunyikan dari daftar aktif. Riwayat produksinya tetap tersimpan dan tidak dapat dipulihkan dari antarmuka pada tahap ini.`}
        onConfirm={() => {
          void handleArchive();
        }}
      />
    </>
  );
}
