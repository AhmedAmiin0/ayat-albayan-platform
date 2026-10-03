import { LESSON_STATUSES } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { toLessonView } from './lessons.mapper';
import { lessonRow } from './lessons.fakes';

const seq = new Map<string, number>();
const admin = { role: 'admin' as const, seq };

describe('toLessonView — «عدّل الوقت» fields (R-SCH-11)', () => {
  it('time_edit_mode: move for open, correct for held, null for the closed statuses', () => {
    const modes = Object.fromEntries(LESSON_STATUSES.map((status) => [status, toLessonView(lessonRow({ status }), admin).time_edit_mode]));
    expect(modes).toEqual({
      scheduled: 'move',
      confirmed: 'move',
      completed: 'correct',
      late: 'correct',
      excused: null,
      no_show: null,
      cancelled_by_teacher: null,
      cancelled_by_admin: null,
      rescheduled: null,
    });
  });

  it('a teacher (or a missing role) never gets an edit mode: they propose or note it in the report', () => {
    for (const role of ['teacher', 'guardian', null] as const) {
      expect(toLessonView(lessonRow(), { role, seq }).time_edit_mode).toBeNull();
    }
  });

  it('time_edit carries when, why and the time it replaced, as ISO instants', () => {
    const view = toLessonView(
      lessonRow({
        time_edited_at: '2026-10-02 09:00:00+00',
        time_edit_reason: 'الحلقة خدت ساعة',
        time_edit_was: { starts_at: '2026-10-04T14:00:00+00:00', ends_at: '2026-10-04T14:45:00+00:00' },
      }),
      admin,
    );
    expect(view.time_edit).toEqual({
      at: '2026-10-02T09:00:00.000Z',
      reason: 'الحلقة خدت ساعة',
      was: { starts_at: '2026-10-04T14:00:00.000Z', ends_at: '2026-10-04T14:45:00.000Z' },
    });
  });

  it('never edited, or an unreadable `was`, gives null; a missing reason is null', () => {
    expect(toLessonView(lessonRow(), admin).time_edit).toBeNull();
    expect(toLessonView(lessonRow({ time_edited_at: '2026-10-02 09:00:00+00', time_edit_was: { nope: 1 } }), admin).time_edit).toBeNull();
    const was = { starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' };
    expect(toLessonView(lessonRow({ time_edited_at: '2026-10-02 09:00:00+00', time_edit_was: was }), admin).time_edit?.reason).toBeNull();
  });
});
