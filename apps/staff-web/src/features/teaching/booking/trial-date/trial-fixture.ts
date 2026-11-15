import type { TrialDateRow, TrialHistory } from '@ab/shared';
import type { Mock } from 'vitest';
import { ABRAR, SLOT, STUDENT_ID, WED_SLOT } from '@/features/teaching/booking/wizard-fixture';

// Test data only (imported by the trial-date *.test.tsx).

export const UPCOMING_ID = '7d2e9f3c-4e5f-4a6b-9c8d-9e8f7a6b5c4d';

export function row(over: Partial<TrialDateRow> = {}): TrialDateRow {
  return {
    lesson_id: UPCOMING_ID,
    starts_at: '2026-10-05T14:00:00.000Z',
    ends_at: '2026-10-05T14:45:00.000Z',
    teacher: { id: ABRAR.id, name: ABRAR.display_name_ar },
    outcome: 'upcoming',
    picked_by: 'سارة',
    picked_at: '2026-10-01T10:00:00.000Z',
    moved_from_id: null,
    ...over,
  };
}

export function history(over: Partial<TrialHistory> = {}): TrialHistory {
  const items = over.items ?? [row()];
  return {
    student_id: STUDENT_ID,
    status: 'trial',
    family_tz: 'Asia/Riyadh',
    allowed: true,
    count: items.length,
    items,
    upcoming_id: UPCOMING_ID,
    ...over,
  };
}

/** apiFetch for the dialog in `base` ('/booking' | '/sales/booking'): history, teachers, slots. */
export function routeTrialFetch(apiFetch: Mock, o: { base: string; history: TrialHistory }): void {
  apiFetch.mockImplementation((path: string) => {
    if (path.startsWith(`${o.base}/trial-dates`)) return Promise.resolve(o.history);
    if (path.startsWith(`${o.base}/teachers`)) return Promise.resolve([ABRAR]);
    if (path.startsWith(`${o.base}/slots`)) {
      const slots = [SLOT, WED_SLOT].map((at) => ({ starts_at: at, ends_at: at, conflicts: [] }));
      return Promise.resolve({ teacher_tz: 'Africa/Cairo', step_min: 45, slots });
    }
    return Promise.reject(new Error(`unmocked ${path}`));
  });
}

/** apiSend: the check answers «no clash»; each POST {base}/trial-date takes the next answer (an Error rejects). */
export function routeTrialSend(apiSend: Mock, o: { base: string; answers: unknown[] }): void {
  apiSend.mockImplementation((_method: string, path: string) => {
    if (path === `${o.base}/trial-date/check`) return Promise.resolve({ conflicts: [] });
    if (path !== `${o.base}/trial-date`) return Promise.reject(new Error(`unmocked ${path}`));
    const answer = o.answers.shift();
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  });
}

/** The bodies sent to POST `path`, in order. */
export const sentTo = (apiSend: Mock, path: string): Record<string, unknown>[] =>
  apiSend.mock.calls.filter(([, p]) => p === path).map(([, , body]) => body as Record<string, unknown>);
