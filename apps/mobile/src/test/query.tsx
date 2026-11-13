import { PUBLIC_SETTING_DEFAULTS, TEACHER_PAGE_SWITCH, type PublicSettings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { publicConfigQuery } from '@/core/lib/query/public-config';
import { seedFullAccess } from './staff-me';

// Test-only helpers: a fresh client per test. No retries; gcTime Infinity so nothing is collected
// mid-test and no 5-minute gc timer keeps the jest worker alive after a mutation settles.

interface TestClientOptions {
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

/** GET /settings/public as `patch` over the defaults (e.g. lesson_confirmation_required: true). */
export function seedPublicConfig(client: QueryClient, patch: Partial<PublicSettings>): void {
  const data = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, ...patch };
  client.setQueryData(publicConfigQuery.queryKey, data);
}

/** A test client for an academy that requires lesson confirmation (the default, 2026-11-03). */
export function confirmingQueryClient(options: TestClientOptions = {}): QueryClient {
  const client = createTestQueryClient(options);
  seedPublicConfig(client, { lesson_confirmation_required: true });
  return client;
}

/** A test client for an academy that requires no lesson confirmation (OFF, owner 2026-11-02). */
export function noConfirmQueryClient(options: TestClientOptions = {}): QueryClient {
  const client = createTestQueryClient(options);
  seedPublicConfig(client, { lesson_confirmation_required: false });
  return client;
}

/** Every teacher page switch set to `on` (settings «صفحات المعلم», default OFF since 2026-11-13). */
export const teacherPagesAll = (on: boolean): Partial<PublicSettings> =>
  Object.fromEntries(Object.values(TEACHER_PAGE_SWITCH).map((key) => [key, on]));

/** A test client whose GET /settings/public has the teacher switches `on`, `patch` over them. */
export function teacherPagesClient(on = true, patch: Partial<PublicSettings> = {}): QueryClient {
  const client = createTestQueryClient();
  seedPublicConfig(client, { ...teacherPagesAll(on), ...patch });
  return client;
}
