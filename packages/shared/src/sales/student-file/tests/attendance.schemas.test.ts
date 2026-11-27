import { describe, expect, it } from 'vitest';
import { studentAttendanceTableSchema as table } from '../attendance.schemas';

const ID = '11111111-1111-4111-8111-111111111111';
const totals = {
  held: 1,
  late: 0,
  absent: 0,
  excused: 0,
  cancelled_by_teacher: 0,
  cancelled_by_admin: 0,
  rescheduled: 0,
  unmarked: 1,
};
const row = {
  lesson_id: ID,
  starts_at: '2026-11-01T10:00:00.000Z',
  duration_min: 30,
  teacher_name: null,
  status: 'completed',
  attendance: null,
  kind: 'unmarked',
  report_sent: false,
  report_id: null,
  cancel_reason: null,
  is_trial: false,
  is_makeup: false,
  is_rescheduled: false,
};
const month = { month: '2026-11', months: ['2026-11'], totals, mine: true };
const report = {
  status: 'submitted',
  submitted_at: '2026-11-01T11:00:00.000Z',
  sent_at: null,
  can_edit: true,
  edit_until: '2026-11-01T12:00:00.000Z',
};

describe('studentAttendanceTableSchema', () => {
  it('reads a staff row without the teacher report and a teacher row with it', () => {
    const moved = { ...row, moved_from: null, moved_to: '2026-11-02T10:00:00.000Z', report };
    const parsed = table.parse({ ...month, items: [{ ...moved, move_reason: 'سفر' }, row] });
    expect(parsed.items[0]).toMatchObject({ move_reason: 'سفر', report: { can_edit: true } });
    expect(parsed.items[1]).not.toHaveProperty('report');
  });

  it('refuses an unknown kind, a missing total or a key it does not know', () => {
    expect(table.safeParse({ ...month, items: [{ ...row, kind: 'maybe' }] }).success).toBe(false);
    expect(table.safeParse({ ...month, items: [], totals: { held: 1 } }).success).toBe(false);
    expect(table.safeParse({ ...month, items: [{ ...row, price: 100 }] }).success).toBe(false);
  });

  it('refuses a month that is not YYYY-MM and an instant that is not ISO', () => {
    expect(table.safeParse({ ...month, items: [], month: 'Nov' }).success).toBe(false);
    const late = { ...row, starts_at: 'yesterday' };
    expect(table.safeParse({ ...month, items: [late] }).success).toBe(false);
  });
});
