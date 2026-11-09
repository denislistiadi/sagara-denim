import { QueryClient } from "@tanstack/react-query";
import { MUTATION_DEFAULTS, QUERY_DEFAULTS } from "./config";

/**
 * Buat QueryClient baru dengan default aplikasi.
 *
 * Provider membuat satu instance per mount; test membuat instance baru per
 * kasus agar cache tidak bocor antar-test.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { ...QUERY_DEFAULTS },
      mutations: { ...MUTATION_DEFAULTS },
    },
  });
}
