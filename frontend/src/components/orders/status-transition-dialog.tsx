"use client";

import {
  mdiAlertCircleOutline,
  mdiArrowRight,
  mdiCheckCircleOutline,
} from "@mdi/js";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
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
import { Label, Textarea } from "@/components/ui/input";
import { ApiError, transitionProductionOrder } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import {
  canReworkOrder,
  getStageLogSummary,
  LOGGABLE_STATUSES,
  type WorkflowAction,
} from "@/lib/workflow";
import type { ProductionOrderDetail } from "@/types";

interface StatusTransitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrderDetail;
  action: WorkflowAction | null;
  onSuccess: (order: ProductionOrderDetail) => void;
  onConflict: (message: string) => void;
}

export function StatusTransitionDialog({
  open,
  onOpenChange,
  order,
  action,
  onSuccess,
  onConflict,
}: StatusTransitionDialogProps) {
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const summary = getStageLogSummary(order);
  const stageIsLoggable = LOGGABLE_STATUSES.includes(order.status);
  const isCancel = Boolean(action?.isCancel);
  const isRework = Boolean(action?.isRework);
  const isCompletion = action?.to === "selesai";
  const finalOutput = order.workflow_summary.final_output;
  const finalLoss = order.workflow_summary.final_loss;
  const missingLog =
    Boolean(action) &&
    !isCancel &&
    stageIsLoggable &&
    summary.input > 0 &&
    !summary.hasLog;
  const incompleteLog =
    Boolean(action) &&
    !isCancel &&
    stageIsLoggable &&
    summary.input > 0 &&
    summary.hasLog &&
    !summary.complete;
  const reworkBlocked = isRework && !canReworkOrder(order);
  const completionBlocked = isCompletion && finalOutput <= 0;
  const requiresNotes =
    Boolean(action?.requiresNotes) || (isCompletion && finalLoss > 0);
  const transitionBlocked =
    missingLog || incompleteLog || reworkBlocked || completionBlocked;

  const transitionMutation = useMutation({
    mutationFn: (input: {
      to: ProductionOrderDetail["status"];
      notes: string | null;
    }) =>
      transitionProductionOrder(order.id, {
        expected_status: order.status,
        to_status: input.to,
        notes: input.notes,
      }),
    onSuccess: (detail) => onSuccess(detail),
    onError: (submitError) => {
      if (submitError instanceof ApiError && submitError.status === 409) {
        onConflict(submitError.message);
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Status perintah produksi gagal diubah.",
      );
    },
  });
  const submitting = transitionMutation.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!action || transitionBlocked) {
      return;
    }

    if (requiresNotes && !notes.trim()) {
      setError(
        action.isCancel
          ? "Alasan wajib diisi untuk membatalkan perintah."
          : isCompletion
            ? `Alasan wajib diisi karena ada kehilangan ${formatNumber(finalLoss)} pcs dari total order.`
            : "Alasan wajib diisi untuk mengembalikan order ke tahap sebelumnya.",
      );
      return;
    }

    setError(null);
    transitionMutation.mutate({
      to: action.to,
      notes: notes.trim() || null,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="workflow-dialog">
        <DialogHeader>
          <DialogTitle>{action?.label ?? "Ubah Status"}</DialogTitle>
          <DialogDescription>
            {action
              ? `${order.code} akan dipindahkan dari status ${ORDER_STATUS_LABELS[order.status]} ke ${ORDER_STATUS_LABELS[action.to]}.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        {action && (
          <form className="dialog-form" onSubmit={handleSubmit}>
            <div className="workflow-flow" aria-hidden="true">
              <span className="workflow-flow-chip">
                {ORDER_STATUS_LABELS[order.status]}
              </span>
              <Icon path={mdiArrowRight} size={18} />
              <span className="workflow-flow-chip workflow-flow-chip-target">
                {ORDER_STATUS_LABELS[action.to]}
              </span>
            </div>

            {stageIsLoggable && (
              <div
                className={
                  missingLog || incompleteLog
                    ? "workflow-stage-summary workflow-stage-summary-danger"
                    : "workflow-stage-summary"
                }
              >
                <div className="workflow-stage-summary-head">
                  <h3>Log tahap {ORDER_STATUS_LABELS[order.status]}</h3>
                  {missingLog || incompleteLog ? (
                    <Icon path={mdiAlertCircleOutline} size={18} />
                  ) : (
                    <Icon path={mdiCheckCircleOutline} size={18} />
                  )}
                </div>
                <dl>
                  <div>
                    <dt>Input Tahap</dt>
                    <dd>{formatNumber(summary.input)}</dd>
                  </div>
                  <div>
                    <dt>Output</dt>
                    <dd>{formatNumber(summary.output)}</dd>
                  </div>
                  <div>
                    <dt>Reject</dt>
                    <dd>{formatNumber(summary.reject)}</dd>
                  </div>
                  <div>
                    <dt>Scrap</dt>
                    <dd>{formatNumber(summary.scrap)}</dd>
                  </div>
                  <div>
                    <dt>Terpakai</dt>
                    <dd>{formatNumber(summary.accounted)}</dd>
                  </div>
                  <div>
                    <dt>Sisa</dt>
                    <dd>{formatNumber(summary.remaining)}</dd>
                  </div>
                </dl>
                {missingLog && (
                  <p className="workflow-stage-summary-note">
                    Catat minimal satu log tahap ini sebelum melanjutkan.
                  </p>
                )}
                {incompleteLog && (
                  <p className="workflow-stage-summary-note">
                    Output + reject + scrap baru{" "}
                    {formatNumber(summary.accounted)} dari{" "}
                    {formatNumber(summary.input)} pcs. Lengkapi akuntansi tahap
                    ini sebelum melanjutkan.
                  </p>
                )}
                {!missingLog && !incompleteLog && summary.input === 0 && (
                  <p className="workflow-stage-summary-note">
                    Tahap ini tidak memiliki input. Transisi dapat dilanjutkan
                    tanpa log.
                  </p>
                )}
              </div>
            )}

            {reworkBlocked && (
              <div className="workflow-callout workflow-callout-warning">
                <Icon path={mdiAlertCircleOutline} size={18} />
                <p>
                  Rework hanya dapat dilakukan bila ada reject QC yang dapat
                  diperbaiki. Scrap bersifat final dan tidak diteruskan.
                </p>
              </div>
            )}

            {isCompletion && (
              <div
                className={
                  completionBlocked
                    ? "workflow-callout workflow-callout-danger"
                    : "workflow-stage-summary"
                }
              >
                <div className="workflow-stage-summary-head">
                  <h3>Rekonsiliasi Akhir</h3>
                  <Icon
                    path={
                      completionBlocked
                        ? mdiAlertCircleOutline
                        : mdiCheckCircleOutline
                    }
                    size={18}
                  />
                </div>
                <dl>
                  <div>
                    <dt>Output Final</dt>
                    <dd>{formatNumber(finalOutput)}</dd>
                  </div>
                  <div>
                    <dt>Kehilangan</dt>
                    <dd>{formatNumber(finalLoss)}</dd>
                  </div>
                  <div>
                    <dt>Total Order</dt>
                    <dd>{formatNumber(order.total_quantity)}</dd>
                  </div>
                </dl>
                {completionBlocked ? (
                  <p className="workflow-stage-summary-note">
                    Output final masih nol. Selesaikan produksi atau batalkan
                    perintah.
                  </p>
                ) : finalLoss > 0 ? (
                  <p className="workflow-stage-summary-note">
                    Kehilangan {formatNumber(finalLoss)} pcs dari total order.
                    Alasan wajib diisi sebelum menyelesaikan perintah.
                  </p>
                ) : (
                  <p className="workflow-stage-summary-note">
                    Output final sama dengan total order.
                  </p>
                )}
              </div>
            )}

            <div className="dialog-field">
              <Label htmlFor="transition-notes">
                Catatan{requiresNotes ? " *" : " (opsional)"}
              </Label>
              <Textarea
                id="transition-notes"
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder={
                  requiresNotes
                    ? action.isCancel
                      ? "Tuliskan alasan pembatalan..."
                      : isCompletion
                        ? "Tuliskan alasan kehilangan kuantitas..."
                        : "Tuliskan alasan rework..."
                    : "Catatan tambahan untuk perubahan status..."
                }
                invalid={requiresNotes && Boolean(error)}
                autoFocus={requiresNotes}
              />
              <span className="field-hint">
                {requiresNotes
                  ? "Alasan wajib diisi dan akan tersimpan di timeline."
                  : "Catatan akan tersimpan di timeline status."}
              </span>
            </div>

            {error && (
              <p className="order-form-error" role="alert">
                {error}
              </p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={submitting}
                >
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                variant={action.isCancel ? "danger" : "primary"}
                loading={submitting}
                disabled={transitionBlocked}
              >
                {action.isCancel ? "Batalkan Perintah" : action.label}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
