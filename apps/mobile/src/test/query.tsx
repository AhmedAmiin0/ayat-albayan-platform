import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { seedFullAccess } from './staff-me';

// Test-only helpers: a fresh client per test. No retries; gcTime Infinity so nothing is collected
// mid-test and no 5-minute gc timer keeps the jest worker alive after a mutation settles.

export interface TestClientOptions {
  /** The test answers GET /auth/me through its apiFetch mock: nothing seeded. */
  meFromApi?: boolean;
}

export function createTestQueryClient({ meFromApi = false }: TestClientOptions = {}): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
  // Signed in with every permission (staff-me.ts); a permissions test seeds or serves its own /auth/me.
  if (!meFromApi) seedFullAccess(client);
  return client;
}

export function queryWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** `await renderWithQuery(<Screen />)`; seed with `client.setQueryData(key, data)` before or after. */
export async function renderWithQuery(ui: ReactElement, client = createTestQueryClient()) {
  const result = await render(ui, { wrapper: queryWrapper(client) });
  return { ...result, client };
}
