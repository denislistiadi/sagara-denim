/**
 * Konfigurasi terpusat lapisan query.
 *
 * Nama root dan segmen hanya didefinisikan di sini agar komponen tidak pernah
 * menulis query key secara literal. Default query meniru perilaku fetch manual
 * sebelumnya: tanpa retry otomatis, tanpa refetch saat fokus/reconnect, dan
 * data dianggap basi segera setelah request selesai.
 */

export const QUERY_ROOTS = {
  dashboard: "dashboard",
  customers: "customers",
  products: "products",
  users: "users",
  materials: "materials",
  orders: "orders",
  reports: "reports",
} as const;

export const QUERY_SEGMENTS = {
  list: "list",
  options: "options",
  queue: "queue",
  detail: "detail",
  movements: "movements",
  production: "production",
} as const;

export const QUERY_DEFAULTS = {
  staleTime: 0,
  gcTime: 5 * 60_000,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

export const MUTATION_DEFAULTS = {
  retry: false,
} as const;
