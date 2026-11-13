import { COURSE_PAUSE_REASON } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { moveOf, reasonShown, seriesEnded } from './lesson-row-notes';
import { lessonRow, TEACHER_ROW } from './student-attendance.fakes';

const OTHER_TEACHER = '7e000000-0000-4000-8000-000000000002';
/** 2 Nov 2026 01:30 in Riyadh, still 1 Nov in UTC. */
const AT = '2026-11-01T22:30:00Z';
const ended = (ends_on: string) => ({ package: '8' as const, ends_on, tz: 'Asia/Riyadh' });
const cancel = (status: 'cancelled_by_admin' | 'excused' | 'cancelled_by_teacher', over = {}) =>
  lessonRow('c', AT, { status, cancel_reason: 'سبب', ...over });

describe('reasonShown (docs/47 cancellation reasons)', () => {
  it('both readers: her own, the academy\'s and the family\'s one-lesson reasons', () => {
    for (const status of ['cancelled_by_teacher', 'cancelled_by_admin', 'excused'] as const) {
      expect([status, reasonShown.staff(cancel(status)), reasonShown.teacher(cancel(status))])
        .toEqual([status, true, true]);
    }
  });

  it('never on a held, scheduled or moved lesson', () => {
    for (const status of ['completed', 'scheduled', 'rescheduled'] as const) {
      const l = lessonRow('x', AT, { status, cancel_reason: 'سبب' });
      expect([reasonShown.staff(l), reasonShown.teacher(l)]).toEqual([false, false]);
    }
  });

  it('a lesson on or after its rule\'s last day (series end, course stop): staff only', () => {
    const onEnd = cancel('cancelled_by_admin', { rule: ended('2026-11-02') });
    const after = cancel('excused', { rule: ended('2026-10-30') });
    expect([reasonShown.teacher(onEnd), reasonShown.teacher(after)]).toEqual([false, false]);
    expect([reasonShown.staff(onEnd), reasonShown.staff(after)]).toEqual([true, true]);
  });

  it('the day is read in the rule\'s zone; a lesson before the last day keeps its reason', () => {
    expect(seriesEnded({ starts_at: AT, rule: ended('2026-11-02') })).toBe(true);
    expect(seriesEnded({ starts_at: AT, rule: { ...ended('2026-11-02'), tz: 'UTC' } })).toBe(false);
    expect(reasonShown.teacher(cancel('cancelled_by_admin', { rule: ended('2026-11-03') }))).toBe(true);
    expect(seriesEnded({ starts_at: AT, rule: null })).toBe(false);
  });

  it('the course pause reason shows even after the rule\'s last day', () => {
    const pause = { rule: ended('2026-10-30'), cancel_reason: COURSE_PAUSE_REASON };
    expect(reasonShown.teacher(cancel('cancelled_by_admin', pause))).toBe(true);
  });
});

describe('moveOf (docs/47 move lines)', () => {
  const from = (teacher_id: string) => ({
    moved_from: { starts_at: '2026-10-05T15:00:00+00:00', cancel_reason: 'سفر', teacher_id },
    rescheduled_from_id: 'old',
  });

  it('a lesson that never moved: all null', () => {
    expect(moveOf(lessonRow('x', AT))).toEqual({ moved_from: null, moved_to: null, move_reason: null });
  });

  it('the old row: where it went and its own reason', () => {
    const old = lessonRow('old', AT, {
      status: 'rescheduled', cancel_reason: 'سفر', moved_to: [{ starts_at: '2026-11-03 15:00:00+00' }],
    });
    expect(moveOf(old)).toEqual({
      moved_from: null, moved_to: '2026-11-03T15:00:00.000Z', move_reason: 'سفر',
    });
  });

  it('the replacement: the old time, and the old reason only when both lessons are hers', () => {
    expect(moveOf(lessonRow('new', AT, from(TEACHER_ROW)))).toEqual({
      moved_from: '2026-10-05T15:00:00.000Z', moved_to: null, move_reason: 'سفر',
    });
    expect(moveOf(lessonRow('new', AT, from(OTHER_TEACHER)))).toMatchObject({
      moved_from: '2026-10-05T15:00:00.000Z', move_reason: null,
    });
  });

  it('a time edit: the time it replaced; the edit reason never leaves', () => {
    const was = { starts_at: '2026-11-01T20:00:00+00:00', ends_at: '2026-11-01T20:30:00+00:00' };
    const edited = { ...lessonRow('e', AT, { time_edit_was: was }), time_edit_reason: 'سر' };
    const lines = moveOf(edited);
    expect(lines).toEqual({ moved_from: '2026-11-01T20:00:00.000Z', moved_to: null, move_reason: null });
    expect(JSON.stringify(lines)).not.toContain('سر');
    expect(moveOf(lessonRow('e', AT, { time_edit_was: { nope: 1 } })).moved_from).toBeNull();
  });
});
