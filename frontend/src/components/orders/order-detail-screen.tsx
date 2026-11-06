"use client";

import {
  mdiAlertCircleOutline,
  mdiArrowLeft,
  mdiChartBoxOutline,
} from "@mdi/js";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { Icon } from "@/components/icon";
import { PageHeader } from "@/components/layout/page-header";
import { OrderFormDialog } from "@/components/orders/order-form-dialog";
import { OrderWorkflowActions } from "@/components/orders/order-workflow-actions";
import { ProductionLogDialog } from "@/components/orders/production-log-dialog";
import { StatusTransitionDialog } from "@/components/orders/status-transition-dialog";
import { WorkflowStepper } from "@/components/orders/workflow-stepper";
import { useOrderOptions } from "@/components/orders/use-order-options";
import { PriorityBadge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  archiveProductionOrder,
  getProductionOrder,
} from "@/lib/api";
import { todayISO, toWIBDate } from "@/lib/date";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import type { WorkflowAction } from "@/lib/workflow";
import type { ProductionOrderDetail } from "@/types";

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
              <Link href="/perintah-produksi" className="ds-btn ds-btn-secondary ds-btn-sm">
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

  const reportStart = toWIBDate(order.created_at) ?? todayISO();
  const reportHref = `/laporan?order_id=${encodeURIComponent(
    order.id,
  )}&order_code=${encodeURIComponent(order.code)}&start_date=${reportStart}&end_date=${todayISO()}`;

  return (
    <>
      <Link href="/perintah-produksi" className="back-link">
        <Icon path={mdiArrowLeft} size={16} />
        Kembali ke daftar perintah
      </Link>

      <PageHeader
        title={order.code}
        subtitle={`Dibuat ${formatDateTime(order.created_at)} oleh ${
          order.created_by?.name ?? "sistem"
        }.`}
        actions={
          <Link
            href={reportHref}
            className="ds-btn ds-btn-secondary ds-btn-sm"
          >
            <Icon path={mdiChartBoxOutline} size={16} />
            Lihat Laporan
          </Link>
        }
      />

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
              {order.deadline ? formatDate(order.deadline, true) : "Tanpa deadline"}
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

      <WorkflowStepper order={order} />

      <OrderWorkflowActions
        order={order}
        role={user?.role}
        onTransition={setTransitionAction}
        onLog={() => setLogOpen(true)}
        onEdit={() => setDialogOpen(true)}
        onArchive={() => setArchiveOpen(true)}
      />

      <section className="order-panel">
        <div className="order-panel-head">
          <div>
            <h2>Item Model</h2>
            <p>Rincian model dan jumlah di dalam perintah ini.</p>
          </div>
        </div>
        <div className="table-scroll">
          <table className="ds-table order-item-table">
            <thead>
              <tr>
                <th>Kode</th>
                <th>Model</th>
                <th>Ukuran</th>
                <th>Warna</th>
                <th>Jumlah</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <span className="code-badge">{item.product.code}</span>
                  </td>
                  <td>
                    <span className="table-primary">{item.product.name}</span>
                  </td>
                  <td>{item.product.size ?? "—"}</td>
                  <td>{item.product.color ?? "—"}</td>
                  <td>
                    <span className="table-number">
                      {formatNumber(item.quantity)}
                    </span>{" "}
                    <span className="table-unit">pcs</span>
                  </td>
                  <td>{item.notes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="order-detail-grid">
        <section className="order-panel">
          <div className="order-panel-head">
            <div>
              <h2>Timeline Status</h2>
              <p>Riwayat perubahan status, alasan, dan waktu setiap tahap.</p>
            </div>
          </div>
          <ol className="order-timeline">
            {order.status_history.map((entry) => (
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

        <section className="order-panel">
          <div className="order-panel-head">
            <div>
              <h2>Log Produksi</h2>
              <p>Output dan reject per tahap, langsung tampil setelah disimpan.</p>
            </div>
          </div>
          {order.production_logs.length > 0 ? (
            <div className="table-scroll">
              <table className="ds-table order-log-table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Tahap</th>
                    <th>Output</th>
                    <th>Reject</th>
                    <th>Oleh</th>
                  </tr>
                </thead>
                <tbody>
                  {order.production_logs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <span className="table-date">
                          {formatDate(log.log_date, true)}
                        </span>
                      </td>
                      <td>{ORDER_STATUS_LABELS[log.stage]}</td>
                      <td>
                        <span className="table-number">
                          {formatNumber(log.output_qty)}
                        </span>{" "}
                        <span className="table-unit">pcs</span>
                      </td>
                      <td>
                        {formatNumber(log.reject_qty)}{" "}
                        <span className="table-unit">pcs</span>
                      </td>
                      <td>{log.created_by?.name ?? "Sistem"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="order-empty-note">
              Belum ada log produksi untuk perintah ini.
            </p>
          )}
        </section>
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

      <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Arsipkan perintah produksi?</DialogTitle>
            <DialogDescription>
              {order.code} akan disembunyikan dari daftar aktif. Riwayat
              produksinya tetap tersimpan dan tidak dapat dipulihkan dari
              antarmuka pada tahap ini.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={archiving}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="danger"
              loading={archiving}
              onClick={() => {
                void handleArchive();
              }}
            >
              Arsipkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
