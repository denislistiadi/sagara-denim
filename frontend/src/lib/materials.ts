import type {
  MaterialSummary,
  StockStatus,
  UserRole,
} from "@/types";

export type StockStatusTone = "red" | "amber" | "green";

export function canManageMaterials(role?: UserRole | null): boolean {
  return role === "admin";
}

export function canRecordStock(role?: UserRole | null): boolean {
  return role === "admin" || role === "operator";
}

export function canAdjustStock(role?: UserRole | null): boolean {
  return role === "admin";
}

export function stockStatusTone(status: StockStatus): StockStatusTone {
  if (status === "habis" || status === "kritis") {
    return "red";
  }
  if (status === "menipis") {
    return "amber";
  }
  return "green";
}

export function toNumber(value: string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function stockProgress(material: MaterialSummary): number {
  const stock = toNumber(material.stock_qty);
  const minimum = toNumber(material.minimum_stock);

  if (minimum <= 0) {
    return stock > 0 ? 100 : 0;
  }

  return Math.min(100, Math.max(0, Math.round((stock / minimum) * 100)));
}
