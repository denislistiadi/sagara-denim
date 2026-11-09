"use client";

import { useQuery } from "@tanstack/react-query";
import {
  customerOptionsQuery,
  productOptionsQuery,
  userOptionsQuery,
} from "@/lib/query/definitions";
import type { CustomerSummary, ProductSummary, UserSummary } from "@/types";

export interface OrderOptionsState {
  customers: CustomerSummary[];
  products: ProductSummary[];
  users: UserSummary[];
  loading: boolean;
  error: string | null;
}

export function useOrderOptions(): OrderOptionsState {
  const customers = useQuery(customerOptionsQuery());
  const products = useQuery(productOptionsQuery());
  const users = useQuery(userOptionsQuery());

  const error = customers.error ?? products.error ?? users.error;

  return {
    customers: customers.data?.items ?? [],
    products: products.data?.items ?? [],
    users: users.data?.items ?? [],
    loading:
      customers.isFetching || products.isFetching || users.isFetching,
    error: error
      ? error instanceof Error
        ? error.message
        : "Pilihan master data gagal dimuat."
      : null,
  };
}
