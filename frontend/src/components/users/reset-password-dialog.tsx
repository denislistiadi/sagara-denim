"use client";

import { useMutation } from "@tanstack/react-query";
import { useId, useState, type FormEvent } from "react";
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
import { Field, Input } from "@/components/ui/input";
import { resetUserPassword } from "@/lib/api";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordPolicyError,
} from "@/lib/users";
import type { UserRecord } from "@/types";

interface ResetPasswordDialogProps {
  open: boolean;
  user: UserRecord;
  isSelf: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted: () => void;
}

export function ResetPasswordDialog({
  open,
  user,
  isSelf,
  onOpenChange,
  onCompleted,
}: ResetPasswordDialogProps) {
  const formId = useId().replace(/:/g, "");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  const resetMutation = useMutation({
    mutationFn: (nextPassword: string) =>
      resetUserPassword(user.id, nextPassword),
    onSuccess: () => onCompleted(),
    onError: (submitError) => {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Kata sandi gagal direset.",
      );
    },
  });
  const saving = resetMutation.isPending;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password.length > PASSWORD_MAX_LENGTH) {
      setError(`Kata sandi maksimal ${PASSWORD_MAX_LENGTH} karakter.`);
      return;
    }
    if (password !== passwordConfirm) {
      setError("Konfirmasi kata sandi tidak sama.");
      return;
    }

    resetMutation.mutate(password);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) {
          onOpenChange(false);
        }
      }}
    >
      <DialogContent className="material-form-dialog">
        <DialogHeader>
          <DialogTitle>Reset Kata Sandi</DialogTitle>
          <DialogDescription>
            Tetapkan kata sandi baru untuk {user.name} ({user.email}).
          </DialogDescription>
        </DialogHeader>

        <p className="material-form-notice">
          {isSelf
            ? "Anda sedang mereset kata sandi akun sendiri. Setelah berhasil, Anda akan keluar dan harus masuk kembali dengan kata sandi baru."
            : "Seluruh sesi aktif pengguna ini akan dicabut. Pengguna harus masuk kembali dengan kata sandi baru."}
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <div className="material-form-grid">
            <Field
              label="Kata Sandi Baru"
              htmlFor={`${formId}-password`}
              required
              hint={`Minimal ${PASSWORD_MIN_LENGTH} karakter, memuat huruf dan angka.`}
            >
              <Input
                id={`${formId}-password`}
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                disabled={saving}
                placeholder="Kata sandi baru"
              />
            </Field>

            <Field
              label="Konfirmasi Kata Sandi"
              htmlFor={`${formId}-password-confirm`}
              required
            >
              <Input
                id={`${formId}-password-confirm`}
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                maxLength={PASSWORD_MAX_LENGTH}
                autoComplete="new-password"
                disabled={saving}
                placeholder="Ulangi kata sandi baru"
              />
            </Field>
          </div>

          {error && (
            <p className="material-form-error" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary" disabled={saving}>
                Batal
              </Button>
            </DialogClose>
            <Button type="submit" loading={saving}>
              Reset Kata Sandi
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
