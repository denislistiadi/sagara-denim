import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MUTATION_DEFAULTS, QUERY_DEFAULTS } from "@/lib/query/config";

/** QueryClient baru per test agar cache tidak bocor antar-kasus. */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        ...QUERY_DEFAULTS,
        gcTime: Infinity,
        retry: false,
      },
      mutations: { ...MUTATION_DEFAULTS },
    },
  });
}

export function createQueryWrapper(
  queryClient: QueryClient = createTestQueryClient(),
) {
  return function QueryWrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}
