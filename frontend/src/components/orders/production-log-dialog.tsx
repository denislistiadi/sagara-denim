"use client";

import { mdiAlertCircleOutline, mdiClipboardTextOutline } from "@mdi/js";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import { createProductionLog, ApiError } from "@/lib/api";
import { todayISO } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { ORDER_STATUS_LABELS } from "@/lib/labels";
import { getStageLogSummary } from "@/lib/workflow";
import type { ProductionLogInput, ProductionOrderDetail } from "@/types";

interface ProductionLogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: ProductionOrderDetail;
  onSuccess: (order: ProductionOrderDetail) => void;
  onConflict: (message: string) => void;
}

export function ProductionLogDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
  onConflict,
}: ProductionLogDialogProps) {
  const today = todayISO();
  const [logDate, setLogDate] = useState(today);
  const [outputQty, setOutputQty] = useState("");
  const [rejectQty, setRejectQty] = useState("");
  const [scrapQty, setScrapQty] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const summary = getStageLogSummary(order);
  const stageLabel = ORDER_STATUS_LABELS[order.status];
  const noRemaining = summary.remaining <= 0;
  const isQc = order.status === "qc";

  const logMutation = useMutation({
    mutationFn: (payload: ProductionLogInput) =>
      createProductionLog(order.id, payload),
    onSuccess: (detail) => onSuccess(detail),
    onError: (submitError) => {
      if (submitError instanceof ApiError && submitError.status === 409) {
        onConflict(submitError.message);
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Log produksi gagal disimpan.",
      );
    },
  });
  const submitting = logMutation.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const output = outputQty.trim() === "" ? 0 : Number(outputQty);
    const reject = isQc && rejectQty.trim() !== "" ? Number(rejectQty) : 0;
    const scrap = scrapQty.trim() === "" ? 0 : Number(scrapQty);

    if (
      !Number.isInteger(output) ||
      !Number.isInteger(reject) ||
      !Number.isInteger(scrap) ||
      output < 0 ||
      reject < 0 ||
      scrap < 0
    ) {
      setError("Output, reject, dan scrap harus bilangan bulat nol atau lebih.");
      return;
    }

    if (output + reject + scrap <= 0) {
      setError("Isi output, reject, atau scrap minimal satu kuantitas.");
      return;
    }

    if (output + reject + scrap > summary.remaining) {
      setError(
        `Jumlah output, reject, dan scrap melebihi sisa input tahap ini (${formatNumber(
          summary.remaining,
        )} pcs).`,
      );
      return;
    }

    if (!logDate) {
      setError("Tanggal log wajib diisi.");
      return;
    }

    if (logDate > today) {
      setError("Tanggal log tidak boleh melewati hari ini.");
      return;
    }

    setError(null);
    logMutation.mutate({
      log_date: logDate,
      output_qty: output,
      reject_qty: reject,
      scrap_qty: scrap,
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
          <DialogTitle>Catat Log Produksi</DialogTitle>
          <DialogDescription>
            {order.code} · Tahap {stageLabel}. Input tahap{" "}
            {formatNumber(summary.input)} pcs. Output diteruskan, reject QC dapat
            dirework, dan scrap final tidak diteruskan.
          </DialogDescription>
        </DialogHeader>

        <form className="dialog-form" onSubmit={handleSubmit}>
          <div className="production-log-stats">
            <div>
              <span>Input Tahap</span>
              <strong>{formatNumber(summary.input)}</strong>
            </div>
            <div>
              <span>Output</span>
              <strong>{formatNumber(summary.output)}</strong>
            </div>
            <div>
              <span>Reject</span>
              <strong>{formatNumber(summary.reject)}</strong>
            </div>
            <div>
              <span>Scrap</span>
              <strong>{formatNumber(summary.scrap)}</strong>
            </div>
            <div>
              <span>Terpakai</span>
              <strong>{formatNumber(summary.accounted)}</strong>
            </div>
            <div className="production-log-remaining">
              <span>Sisa</span>
              <strong>{formatNumber(summary.remaining)}</strong>
            </div>
          </div>

          {noRemaining && (
            <div className="workflow-callout workflow-callout-danger">
              <Icon path={mdiAlertCircleOutline} size={18} />
              <p>
                Sisa input tahap ini sudah habis. Lanjutkan ke tahap berikutnya
                atau lakukan rework dari reject QC.
              </p>
            </div>
          )}

          <div className="dialog-form-grid">
            <div className="dialog-field">
              <Label htmlFor="log-date">Tanggal Log</Label>
              <DatePicker
                id="log-date"
                value={logDate}
                onChange={setLogDate}
                placeholder="Pilih tanggal log"
                max={today}
                clearable={false}
                ariaLabel="Pilih tanggal log produksi"
              />
            </div>

            <div className="dialog-field">
              <Label htmlFor="log-output">Output</Label>
              <Input
                id="log-output"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={outputQty}
                onChange={(event) => setOutputQty(event.target.value)}
                placeholder="0"
                suffix="pcs"
                disabled={noRemaining}
              />
            </div>

            {isQc && (
              <div className="dialog-field">
                <Label htmlFor="log-reject">Reject</Label>
                <Input
                  id="log-reject"
                  type="number"
                  min={0}
                  step={1}
                  inputMode="numeric"
                  value={rejectQty}
                  onChange={(event) => setRejectQty(event.target.value)}
                  placeholder="0"
                  suffix="pcs"
                  disabled={noRemaining}
                />
              </div>
            )}

            <div className="dialog-field">
              <Label htmlFor="log-scrap">Scrap</Label>
              <Input
                id="log-scrap"
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={scrapQty}
                onChange={(event) => setScrapQty(event.target.value)}
                placeholder="0"
                suffix="pcs"
                disabled={noRemaining}
              />
            </div>

            <div className="dialog-field dialog-field-full">
              <Label htmlFor="log-notes">Catatan (opsional)</Label>
              <Textarea
                id="log-notes"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Kendala bahan, cacat jahitan, atau keterangan lain..."
                disabled={noRemaining}
              />
            </div>
          </div>

          <p className="production-log-hint">
            <Icon path={mdiClipboardTextOutline} size={16} />
            Maksimal {formatNumber(summary.remaining)} pcs pada log ini.
            {!isQc &&
              " Reject hanya untuk QC; gunakan scrap untuk material cacat yang tidak dapat diperbaiki."}
          </p>

          {error && (
            <p className="order-form-error" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={submitting}>
                Batal
              </Button>
            </DialogClose>
            <Button
              type="submit"
              loading={submitting}
              disabled={noRemaining}
            >
              Simpan Log
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
