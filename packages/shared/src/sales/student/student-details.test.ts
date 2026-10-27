import { describe, expect, it } from 'vitest';
import { attendanceKind, attendanceTotals, salesCancelSchema, salesRescheduleSchema } from './student-details.js';

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

describe('sales lesson bodies', () => {
  it('reschedule takes a time only: no series, substitute or override', () => {
    expect(salesRescheduleSchema.safeParse({ startsAt: '2026-11-01T15:00:00Z' }).success).toBe(true);
    expect(salesRescheduleSchema.safeParse({ startsAt: '2026-11-01T15:00:00Z', scope: 'rule' }).success).toBe(false);
    expect(salesRescheduleSchema.safeParse({ startsAt: '2026-11-01T15:00:00Z', override: { reason: 'x' } }).success).toBe(false);
  });

  it('cancel needs no reason and refuses a series or a «by»', () => {
    expect(salesCancelSchema.parse({})).toEqual({});
    expect(salesCancelSchema.parse({ reason: '  family travel ' })).toEqual({ reason: 'family travel' });
    expect(salesCancelSchema.safeParse({ scope: 'rule' }).success).toBe(false);
    expect(salesCancelSchema.safeParse({ by: 'student' }).success).toBe(false);
  });
});
