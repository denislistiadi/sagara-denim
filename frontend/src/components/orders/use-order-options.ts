"use client";

import { useEffect, useState } from "react";
import { catalogApi } from "@/lib/api";
import type { CustomerSummary, ProductSummary, UserSummary } from "@/types";

export interface OrderOptionsState {
  customers: CustomerSummary[];
  products: ProductSummary[];
  users: UserSummary[];
  loading: boolean;
  error: string | null;
}

export function useOrderOptions(): OrderOptionsState {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const [customerList, productList, userList] = await Promise.all([
          catalogApi.customers(),
          catalogApi.products(),
          catalogApi.users(),
        ]);

        if (!cancelled) {
          setCustomers(customerList.items);
          setProducts(productList.items);
          setUsers(userList.items);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Pilihan master data gagal dimuat.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { customers, products, users, loading, error };
}
