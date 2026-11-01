import type { OrderStatus, Priority, UserRole } from "@/types";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  menunggu: "Menunggu",
  cutting: "Cutting",
  jahit: "Jahit",
  finishing: "Finishing",
  qc: "QC",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

export const ORDER_STATUS_OPTIONS = (
  Object.entries(ORDER_STATUS_LABELS) as [OrderStatus, string][]
).map(([value, label]) => ({ value, label }));

export const PRIORITY_LABELS: Record<Priority, string> = {
  tinggi: "Tinggi",
  normal: "Normal",
  rendah: "Rendah",
};

export const PRIORITY_OPTIONS = (
  Object.entries(PRIORITY_LABELS) as [Priority, string][]
).map(([value, label]) => ({ value, label }));

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin Produksi",
  operator: "Operator Produksi",
  qc: "QC",
};
