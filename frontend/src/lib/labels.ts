import type {
  OrderStatus,
  Priority,
  ProductionStage,
  StockMovementType,
  StockStatus,
  UserRole,
} from "@/types";

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

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  habis: "Habis",
  kritis: "Kritis",
  menipis: "Menipis",
  aman: "Aman",
};

export const STOCK_STATUS_OPTIONS = (
  Object.entries(STOCK_STATUS_LABELS) as [StockStatus, string][]
).map(([value, label]) => ({ value, label }));

export const STOCK_MOVEMENT_LABELS: Record<StockMovementType, string> = {
  masuk: "Stok Masuk",
  keluar: "Stok Keluar",
  penyesuaian: "Penyesuaian",
};

export const STOCK_MOVEMENT_OPTIONS = (
  Object.entries(STOCK_MOVEMENT_LABELS) as [StockMovementType, string][]
).map(([value, label]) => ({ value, label }));

export const PRODUCTION_STAGE_LABELS: Record<ProductionStage, string> = {
  cutting: "Cutting",
  jahit: "Jahit",
  finishing: "Finishing",
  qc: "QC",
};

export const PRODUCTION_STAGE_OPTIONS = (
  Object.entries(PRODUCTION_STAGE_LABELS) as [ProductionStage, string][]
).map(([value, label]) => ({ value, label }));

export const PRODUCTION_STAGE_TONE: Record<
  ProductionStage,
  "blue" | "orange" | "purple" | "amber"
> = {
  cutting: "blue",
  jahit: "orange",
  finishing: "purple",
  qc: "amber",
};
