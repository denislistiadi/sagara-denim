/** Tipe data master pelanggan dan produk. */

import type {
  CustomerSummary,
  ProductSummary,
} from "./common";

export type CatalogActiveFilter = "aktif" | "nonaktif" | "semua";

export interface CustomerRecord extends CustomerSummary {
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductRecord extends ProductSummary {
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CatalogListResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
