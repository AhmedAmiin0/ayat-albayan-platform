import { PUBLIC_SETTING_DEFAULTS, TEACHER_PAGE_SWITCH, type PublicSettings } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { publicConfigQuery } from './public-config';

/** Tests only: every teacher page switch set to `on` (they default OFF since owner 2026-11-13). */
export const teacherPagesAll = (on: boolean): Partial<PublicSettings> =>
  Object.fromEntries(Object.values(TEACHER_PAGE_SWITCH).map((key) => [key, on]));

/** Tests only: GET /settings/public as answered, the teacher switches `on`, `patch` over them. */
export function setTeacherPages(
  client: QueryClient,
  on: boolean,
  patch: Partial<PublicSettings> = {},
): QueryClient {
  const config = { ...PUBLIC_SETTING_DEFAULTS, ...teacherPagesAll(on), ...patch, custom: {} };
  client.setQueryData(publicConfigQuery.queryKey, config);
  return client;
}

/** Tests only: a render `wrapper` with a fresh client and the teacher switches answered. */
export function teacherPagesWrapper(on = true, patch: Partial<PublicSettings> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  setTeacherPages(client, on, patch);
  return function TeacherPagesWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
