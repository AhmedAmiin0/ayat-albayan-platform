import { TEACHER_PAGE_SWITCH, type PublicSettings } from '@ab/settings';
import type { QueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import {
  freshQueryClient,
  renderWithQuery as render,
  seedPublicConfig,
} from '@ab/mobile-kit/testing/query';
import { seedFullAccess } from './staff-me';

// Test-only helpers: the shared fresh client and settings seed (@ab/mobile-kit), signed in as
// staff.
export { queryWrapper, seedPublicConfig } from '@ab/mobile-kit/testing/query';

interface TestClientOptions {
  /** The test answers GET /auth/me through its apiFetch mock: nothing seeded. */
  meFromApi?: boolean;
}

export function createTestQueryClient({ meFromApi = false }: TestClientOptions = {}): QueryClient {
  const client = freshQueryClient();
  // Signed in with every permission (staff-me.ts); a permissions test seeds or serves its own /auth/me.
  if (!meFromApi) seedFullAccess(client);
  return client;
}

/** `await renderWithQuery(<Screen />)`; seed with `client.setQueryData(key, data)` before or after. */
export const renderWithQuery = (ui: ReactElement, client = createTestQueryClient()) =>
  render(ui, client);

/** A test client for an academy that requires lesson confirmation (the default, 2026-11-03). */
export function confirmingQueryClient(options: TestClientOptions = {}): QueryClient {
  const client = createTestQueryClient(options);
  seedPublicConfig(client, { lesson_confirmation_required: true });
  return client;
}

/** A test client for an academy that requires no lesson confirmation (OFF). */
export function noConfirmQueryClient(options: TestClientOptions = {}): QueryClient {
  const client = createTestQueryClient(options);
  seedPublicConfig(client, { lesson_confirmation_required: false });
  return client;
}

/** Every teacher page switch set to `on` (they default OFF since 2026-11-13). */
const teacherPagesAll = (on: boolean): Partial<PublicSettings> =>
  Object.fromEntries(Object.values(TEACHER_PAGE_SWITCH).map((key) => [key, on]));

/** A test client whose GET /settings/public has the teacher switches `on`, `patch` over them. */
export function teacherPagesClient(on = true, patch: Partial<PublicSettings> = {}): QueryClient {
  const client = createTestQueryClient();
  seedPublicConfig(client, { ...teacherPagesAll(on), ...patch });
  return client;
}
