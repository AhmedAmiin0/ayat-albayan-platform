import { describe, expect, it } from 'vitest';
import { HELD_REPORT, NOW, octoberLessons } from './student-attendance.fakes';
import { toAttendanceTable } from './student-attendance.mapper';
import { rowReport } from './teacher-row-report';

const SUBMITTED = '2026-10-28T09:45:00Z';
const report = { id: 'r', lesson_id: 'l', submitted_at: SUBMITTED, sent_at: null };

describe('rowReport (the teacher\'s report state per log row, docs/47)', () => {
  it('inside her window: editable until submit + minutes', () => {
    expect(rowReport(report, { now: NOW, minutes: 30 })).toEqual({
      status: 'submitted',
      submitted_at: '2026-10-28T09:45:00.000Z',
      sent_at: null,
      can_edit: true,
      edit_until: '2026-10-28T10:15:00.000Z',
    });
  });

  it('after the window, or once sent to the family: view only', () => {
    expect(rowReport(report, { now: NOW, minutes: 10 })).toMatchObject({
      can_edit: false, edit_until: '2026-10-28T09:55:00.000Z',
    });
    const sent = { ...report, sent_at: '2026-10-28T09:50:00Z' };
    expect(rowReport(sent, { now: NOW, minutes: 30 })).toMatchObject({
      can_edit: false, sent_at: '2026-10-28T09:50:00.000Z',
    });
  });

  it('without a submit time (never expected): no window end', () => {
    expect(rowReport({ ...report, submitted_at: null }, { now: NOW, minutes: 30 }).edit_until)
      .toBeNull();
  });
});

describe('toAttendanceTable for the teacher reader', () => {
  const teacherTable = (minutes?: number) =>
    toAttendanceTable({
      month: '2026-10', lessons: octoberLessons(), reports: [HELD_REPORT], starts: [], mine: true,
      reader: 'teacher', ...(minutes === undefined ? {} : { minutes }),
    }, NOW);

  it('every row has `report`: the state of a submitted one, else null', () => {
    const items = teacherTable(24 * 60).items;
    expect(items.find((r) => r.lesson_id === 'held')?.report).toMatchObject({
      status: 'submitted', can_edit: true,
    });
    const rest = items.filter((r) => r.lesson_id !== 'held');
    expect(rest.every((r) => r.report === null)).toBe(true);
  });

  it('no minutes given: the window is already closed', () => {
    const held = teacherTable().items.find((r) => r.lesson_id === 'held');
    expect(held?.report?.can_edit).toBe(false);
  });
});
