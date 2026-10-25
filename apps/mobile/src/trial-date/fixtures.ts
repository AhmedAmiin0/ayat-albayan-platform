import type { TrialDateResult, TrialDateRow, TrialHistory } from '@ab/shared';
import { maryam, SUN_17 } from '@/booking/testing/fixtures';

// Invented answers of GET …/trial-dates and POST …/trial-date (no real people).

export const STUDENT = '44444444-4444-4444-8444-444444444444';
export const UPCOMING = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
export const OLD = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
export const NEW_LESSON = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

/** Thursday 1 Oct 2026, 18:00 Riyadh: an upcoming trial with مريم. */
export const THU_1_18 = '2026-10-01T15:00:00.000Z';

export function trialRow(fields: Partial<TrialDateRow> = {}): TrialDateRow {
  return {
    lesson_id: UPCOMING,
    starts_at: THU_1_18,
    ends_at: '2026-10-01T15:45:00.000Z',
    teacher: { id: maryam.id, name: maryam.display_name_ar },
    outcome: 'upcoming',
    picked_by: 'فاطمة',
    picked_at: '2026-09-28T09:00:00.000Z',
    moved_from_id: null,
    ...fields,
  };
}

/** A history: `items` newest pick first; the count follows them. */
export function historyOf(items: TrialDateRow[], fields: Partial<TrialHistory> = {}): TrialHistory {
  return {
    student_id: STUDENT,
    status: 'trial',
    family_tz: 'Asia/Riyadh',
    allowed: true,
    count: items.length,
    items,
    upcoming_id: items.find((r) => r.outcome === 'upcoming')?.lesson_id ?? null,
    ...fields,
  };
}

export function trialResult(fields: Partial<TrialDateResult> = {}): TrialDateResult {
  return {
    lesson_id: NEW_LESSON,
    starts_at: SUN_17,
    ends_at: '2026-10-04T14:45:00.000Z',
    teacher_id: maryam.id,
    moved_from_id: UPCOMING,
    ...fields,
  };
}
