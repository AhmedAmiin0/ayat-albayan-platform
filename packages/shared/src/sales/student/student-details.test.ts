import { describe, expect, it } from 'vitest';
import { attendanceKind, attendanceTotals } from './student-details';
import { ATTENDANCE_KINDS, attendanceKindSchema } from './details-answer.schemas';

describe('attendanceKind', () => {
  it.each([
    ['completed', 'on_time', 'present'],
    ['completed', 'late', 'present'],
    ['late', null, 'present'],
    ['completed', null, 'present'],
    ['completed', 'absent', 'absent'],
    ['no_show', null, 'absent'],
    ['no_show', 'absent', 'absent'],
    ['excused', 'excused', 'excused'],
    ['excused', null, 'excused'],
    ['cancelled_by_admin', null, 'cancelled'],
    ['cancelled_by_teacher', null, 'cancelled'],
    ['scheduled', null, 'unmarked'],
    ['confirmed', null, 'unmarked'],
  ] as const)('%s + %s = %s', (status, attendance, kind) => {
    expect(attendanceKind(status, attendance)).toBe(kind);
  });

  it('drops a moved lesson: its new lesson is the day', () => {
    expect(attendanceKind('rescheduled', null)).toBeNull();
  });
});

describe('attendanceTotals', () => {
  it('counts each kind, zero for the rest', () => {
    expect(attendanceTotals([{ kind: 'present' }, { kind: 'present' }, { kind: 'absent' }])).toEqual({
      present: 2,
      absent: 1,
      excused: 0,
      cancelled: 0,
      unmarked: 0,
    });
  });
});

describe('attendanceKindSchema', () => {
  it('accepts each attendance list kind and nothing else', () => {
    expect(attendanceKindSchema.options).toEqual([...ATTENDANCE_KINDS]);
    expect(attendanceKindSchema.validate('late')).toBe(false);
  });
});
