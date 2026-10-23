import type { AcademySettings, GoogleStatusView, IntegrationConfigItem, SendGateView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { Mock } from 'vitest';
import { ApiError } from '@/lib/api';
import { SETTINGS } from '@/test/settings-fixture';

/** What each read answers; a missing entry answers 403 (a role without that permission). */
export interface HubAnswers {
  settings?: AcademySettings;
  gate?: SendGateView;
  integrations?: IntegrationConfigItem[];
  google?: GoogleStatusView;
}

const PATHS: Record<string, keyof HubAnswers> = {
  '/settings': 'settings',
  '/messages/gate': 'gate',
  '/settings/integrations': 'integrations',
  '/admin/google/status': 'google',
};

/** Answers apiFetch by path from `answers`; anything else is forbidden. */
export function answerHub(apiFetch: Mock, answers: HubAnswers): void {
  apiFetch.mockImplementation((path: string) => {
    const key = PATHS[path];
    const value = key ? answers[key] : undefined;
    return value === undefined ? Promise.reject(new ApiError(403, { code: 'forbidden' })) : Promise.resolve(value);
  });
}

/** Renders inside a fresh query client (no retries, nothing stale). */
export function renderHub(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

/** The seeded settings with a few values changed. */
export const settingsWith = (patch: Partial<AcademySettings>): AcademySettings => ({ ...SETTINGS, ...patch });

/** One integrations row. */
export const item = (key: IntegrationConfigItem['key'], group: IntegrationConfigItem['group'], o: { secret?: boolean; set?: boolean } = {}): IntegrationConfigItem => ({
  key,
  group,
  secret: o.secret ?? false,
  value: null,
  set: o.set ?? false,
  source: o.set ? 'db' : 'unset',
  updated_at: null,
});

/** GET /admin/google/status, connected in dry run unless changed. */
export const googleStatus = (patch: Partial<GoogleStatusView> = {}): GoogleStatusView => ({
  configured: true,
  connection: { status: 'connected', email: 'academy@example.com', scopes: [], connected_at: null, last_error: null },
  settings: { enabled: true, mode: 'dry_run', window_days: 60 },
  redirect_uri: 'http://localhost:3000/admin/google/callback',
  scopes: [],
  drive: { root_folder_id: null, root_folder_name: null, summary_sheet_id: null, confirmed_at: null },
  discovery: null,
  counts: { pending: 0, synced: 0, gone: 0, failed: 0, skipped: 0 },
  warnings: { teacher_unmapped: 0, student_unmapped: 0, drive_unconfirmed: 0 },
  targets: { main_calendar: '', teacher_calendars: [] },
  last_run_at: null,
  ...patch,
});
