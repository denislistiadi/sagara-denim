import type { CustomerSummary, ProductSummary, UserSummary } from "@/types";
import { apiGet } from "./client";

export interface OptionList<T> {
  items: T[];
  total: number;
}

export function listCustomers(search?: string): Promise<OptionList<CustomerSummary>> {
  return apiGet<OptionList<CustomerSummary>>("/api/customers", {
    query: { search },
  });
}

export function listProducts(search?: string): Promise<OptionList<ProductSummary>> {
  return apiGet<OptionList<ProductSummary>>("/api/products", {
    query: { search },
  });
}

export function listUserOptions(): Promise<OptionList<UserSummary>> {
  return apiGet<OptionList<UserSummary>>("/api/users/options");
}

export const catalogApi = {
  customers: listCustomers,
  products: listProducts,
  users: listUserOptions,
} as const;
