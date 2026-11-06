"use client";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createUser,
  updateUser,
  type UserCreateInput,
  type UserUpdateInput,
} from "@/lib/api";
import { USER_ROLE_LABELS } from "@/lib/labels";
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  passwordPolicyError,
} from "@/lib/users";
import type { UserRecord, UserRole } from "@/types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserRecord | null;
  currentUserId?: string;
  onSaved: (user: UserRecord, mode: "create" | "edit") => void;
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  currentUserId,
  onSaved,
}: UserFormDialogProps) {
  const formId = useId().replace(/:/g, "");
  const isSelf = Boolean(user && user.id === currentUserId);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "operator");
  const [activeValue, setActiveValue] = useState(
    user?.is_active === false ? "nonaktif" : "aktif",
  );
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Nama pengguna wajib diisi.");
      return;
    }
    if (cleanName.length > 120) {
      setError("Nama pengguna maksimal 120 karakter.");
      return;
    }
    if (!cleanEmail) {
      setError("Email wajib diisi.");
      return;
    }
    if (!EMAIL_PATTERN.test(cleanEmail)) {
      setError("Format email tidak valid.");
      return;
    }

    if (!user) {
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
    }

    setSaving(true);

    try {
      let saved: UserRecord;

      if (user) {
        const payload: UserUpdateInput = {
          email: cleanEmail,
          name: cleanName,
        };
        if (!isSelf) {
          payload.role = role;
          payload.is_active = activeValue === "aktif";
        }
        saved = await updateUser(user.id, payload);
      } else {
        const payload: UserCreateInput = {
          email: cleanEmail,
          name: cleanName,
          role,
          password,
        };
        saved = await createUser(payload);
      }

      onSaved(saved, user ? "edit" : "create");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Pengguna gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="material-form-dialog">
        <DialogHeader>
          <DialogTitle>
            {user ? "Ubah Pengguna" : "Tambah Pengguna"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? `Perbarui data akun ${user.name}. Perubahan peran dan status akan mengakhiri sesi pengguna.`
              : "Akun baru dapat langsung masuk menggunakan email dan kata sandi yang ditetapkan admin."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate>
          <div className="material-form-grid">
            <Field label="Nama Pengguna" htmlFor={`${formId}-name`} required>
              <Input
                id={`${formId}-name`}
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                disabled={saving}
                placeholder="Raka Pratama"
              />
            </Field>

            <Field label="Email" htmlFor={`${formId}-email`} required>
              <Input
                id={`${formId}-email`}
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                maxLength={255}
                autoComplete="off"
                disabled={saving}
                placeholder="nama@sagara.co.id"
              />
            </Field>

            <Field
              label="Peran"
              htmlFor={`${formId}-role`}
              hint={
                isSelf
                  ? "Peran akun sendiri tidak dapat diubah."
                  : "Peran menentukan menu dan aksi yang tersedia."
              }
            >
              <Select
                value={role}
                onValueChange={(value) => setRole(value as UserRole)}
                disabled={saving || isSelf}
              >
                <SelectTrigger id={`${formId}-role`} disabled={saving || isSelf}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    {USER_ROLE_LABELS.admin}
                  </SelectItem>
                  <SelectItem value="operator">
                    {USER_ROLE_LABELS.operator}
                  </SelectItem>
                  <SelectItem value="qc">{USER_ROLE_LABELS.qc}</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {user && !isSelf && (
              <Field
                label="Status Akun"
                htmlFor={`${formId}-active`}
                hint="Akun nonaktif tidak dapat masuk, tetapi datanya tetap tersimpan."
              >
                <Select value={activeValue} onValueChange={setActiveValue}>
                  <SelectTrigger id={`${formId}-active`} disabled={saving}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aktif">Aktif</SelectItem>
                    <SelectItem value="nonaktif">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            )}

            {!user && (
              <>
                <Field
                  label="Kata Sandi"
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
                    onChange={(event) =>
                      setPasswordConfirm(event.target.value)
                    }
                    maxLength={PASSWORD_MAX_LENGTH}
                    autoComplete="new-password"
                    disabled={saving}
                    placeholder="Ulangi kata sandi"
                  />
                </Field>
              </>
            )}
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
              {user ? "Simpan Perubahan" : "Tambah Pengguna"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
