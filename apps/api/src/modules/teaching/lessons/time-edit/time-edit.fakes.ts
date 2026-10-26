// Fixtures for the «عدّل الوقت» service tests (not shipped; excluded from the build by *.fakes.ts).
import type { AcademySettings, LessonTimeEdit } from '@ab/shared';
import { vi } from 'vitest';
import type { TimeEditChange } from '../../scheduling/change-set';
import type { ConflictChecker } from '../../scheduling/conflicts/conflict-checker';
import { fakeSettings } from '../../../../common/settings/settings.fakes';
import type { LessonRow } from '../store/lesson-row';
import { ADMIN, fakeStore, LESSON_ID, lessonRow } from '../lessons.fakes';
import { LessonsSettings } from '../lessons.settings';
import { LessonTimeService } from './time-edit.service';
import { TimeEditPayout } from './time-edit.payout';
import type { TimeEditQueries } from './time-edit.queries';

export { ADMIN, LESSON_ID, lessonRow };
/** The clock of every test: Fri 2026-10-02 10:00Z (no DST change near it in Cairo or Riyadh). */
export const NOW = new Date('2026-10-02T10:00:00Z');

/** Scheduled Sun 2026-10-04 14:00–14:45Z = 17:00 in Riyadh and Cairo; this is its edit request. */
export const body = (over: Partial<LessonTimeEdit> = {}): LessonTimeEdit => ({
  expectedStartsAt: '2026-10-04T14:00:00.000Z',
  startsAt: '2026-10-05T14:00:00.000Z',
  durationMin: 45,
  ...over,
});

/** A completed lesson on Thu 2026-10-01 14:00–14:45Z and the correction request for it (45 → 60). */
export const heldRow = (over: Partial<LessonRow> = {}): LessonRow =>
  lessonRow({ status: 'completed', starts_at: '2026-10-01T14:00:00+00:00', ends_at: '2026-10-01T14:45:00+00:00', ...over });
export const correction = (over: Partial<LessonTimeEdit> = {}): LessonTimeEdit => ({
  expectedStartsAt: '2026-10-01T14:00:00.000Z',
  startsAt: '2026-10-01T14:00:00.000Z',
  durationMin: 60,
  reason: 'الحلقة خدت ساعة بدل 45 دقيقة',
  ...over,
});

export const CLASH = { kind: 'teacher_busy', startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z', lessonId: 'x' };

/** `over`: the academy settings on top of the registry defaults (payout_count_late / _no_show off). */
export function timeSetup(row: LessonRow | null = lessonRow(), over: Partial<AcademySettings> = {}) {
  const deps = fakeStore(row);
  const checker = { check: vi.fn().mockResolvedValue([]) };
  const settings = fakeSettings(over);
  const payouts = { payoutStatus: vi.fn().mockResolvedValue(null) };
  const payout = new TimeEditPayout(new LessonsSettings(settings), payouts as unknown as TimeEditQueries);
  const service = new LessonTimeService(deps.store, checker as unknown as ConflictChecker, payout);
  const run = (b: LessonTimeEdit) => service.edit({ lessonId: LESSON_ID, body: b, actor: ADMIN });
  return { ...deps, checker, settings, payouts, service, run };
}

/** The payload of the n-th edit_lesson_time call. */
export const retimed = (writer: { retime: ReturnType<typeof vi.fn> }, n = 0): TimeEditChange => {
  const change = writer.retime.mock.calls[n]?.[0] as TimeEditChange | undefined;
  if (!change) throw new Error('retime was not called');
  return change;
};
