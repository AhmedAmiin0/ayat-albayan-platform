import { describe, expect, it } from 'vitest';
import { attendanceWindow, monthsOf, toAttendanceTable } from './student-attendance.mapper';
import { lessonRow, NOW, octoberLessons } from './student-attendance.fakes';

const table = () =>
  toAttendanceTable({ month: '2026-10', lessons: octoberLessons(), reports: [{ id: 'rep-held', lesson_id: 'held' }], starts: [], mine: true }, NOW);

describe('attendanceWindow', () => {
  it('a past month: its whole Riyadh bounds', () => {
    expect(attendanceWindow('2026-09', NOW)).toEqual({ from: new Date('2026-08-31T21:00:00Z'), to: new Date('2026-09-30T21:00:00Z') });
  });

  it('the current month stops at now (only lessons that started)', () => {
    expect(attendanceWindow('2026-10', NOW)).toEqual({ from: new Date('2026-09-30T21:00:00Z'), to: NOW });
  });
});

describe('monthsOf', () => {
  it('the months of every start in Riyadh and the current one, newest first, each once', () => {
    expect(monthsOf(['2026-10-01T10:00:00Z', '2026-09-30T21:30:00Z', '2026-08-31T20:00:00Z'], NOW)).toEqual(['2026-10', '2026-08']);
    expect(monthsOf([], NOW)).toEqual(['2026-10']);
  });
});

describe('toAttendanceTable', () => {
  it('only lessons that started, newest first, with duration, teacher, status and the report', () => {
    const t = table();
    expect(t.items.map((r) => r.lesson_id)).toEqual(['held', 'late', 'absent', 'excused', 'byTeacher', 'byAdmin', 'moved', 'trial']);
    expect(t.items[0]).toEqual({
      lesson_id: 'held', starts_at: '2026-10-27T15:00:00.000Z', duration_min: 30, teacher_name: 'أبرار', status: 'completed', attendance: 'on_time',
      kind: 'present', report_id: 'rep-held', cancel_reason: null, is_trial: false, is_makeup: false, is_rescheduled: false,
    });
  });

  it('the totals of every kind, late on top of held', () => {
    expect(table().totals).toEqual({
      held: 3, late: 1, absent: 1, excused: 1, cancelled_by_teacher: 1, cancelled_by_admin: 1, rescheduled: 1, unmarked: 0,
    });
  });

  it('tags a trial, a makeup and a moved-in lesson; a moved lesson has no kind', () => {
    const byId = new Map(table().items.map((r) => [r.lesson_id, r]));
    expect(byId.get('trial')).toMatchObject({ is_trial: true, is_rescheduled: true });
    expect(byId.get('late')).toMatchObject({ is_makeup: true, kind: 'present', attendance: 'late' });
    expect(byId.get('moved')?.kind).toBeNull();
  });

  it('the cancel reason only on a cancelled lesson', () => {
    const reasons = table().items.filter((r) => r.cancel_reason).map((r) => [r.lesson_id, r.cancel_reason]);
    expect(reasons).toEqual([['byTeacher', 'سفر المعلمة'], ['byAdmin', 'عطلة']]);
  });

  it('an imported free lesson (no rule, not chargeable) is a trial', () => {
    const row = lessonRow('imp', '2026-10-02T10:00:00Z', { rule_id: null, rule: null, own: [{ student_id: 's', attendance: null, chargeable: false }] });
    const t = toAttendanceTable({ month: '2026-10', lessons: [row], reports: [], starts: [], mine: false }, NOW);
    expect([t.items[0]?.is_trial, t.mine]).toEqual([true, false]);
  });

  it('never a price, a link or notes', () => {
    expect(JSON.stringify(table())).not.toMatch(/meet|secret|notes|price|290|سر"/);
  });
});
