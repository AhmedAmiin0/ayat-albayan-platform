import { PUBLIC_SETTING_DEFAULTS, type PublicSettings } from '@ab/settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { publicConfigQuery } from '../lib/query/public-config';

// Test-only helpers both apps use: a fresh client per test. No retries; gcTime Infinity so nothing
// is collected mid-test and no 5-minute gc timer keeps the jest worker alive after a mutation.

/** A query client with nothing seeded. */
export function freshQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

export function queryWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

/** `await renderWithQuery(<Screen />, client)`; seed with `client.setQueryData(key, data)`. */
export async function renderWithQuery(ui: ReactElement, client: QueryClient) {
  const result = await render(ui, { wrapper: queryWrapper(client) });
  return { ...result, client };
}

/** GET /settings/public as `patch` over the defaults (e.g. lesson_confirmation_required: true). */
export function seedPublicConfig(client: QueryClient, patch: Partial<PublicSettings>): void {
  const data = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, ...patch };
  client.setQueryData(publicConfigQuery.queryKey, data);
}
