import { describe, expect, it } from 'vitest';
import { attendanceTableSchema } from './attendance-table-schema.js';

const totals = {
  held: 1, late: 0, absent: 0, excused: 0,
  cancelled_by_teacher: 0, cancelled_by_admin: 0, rescheduled: 0, unmarked: 1,
};
const row = {
  lesson_id: 'l1', starts_at: '2026-11-01T10:00:00.000Z', duration_min: 30, teacher_name: null,
  status: 'completed', attendance: null, kind: 'unmarked', report_sent: false, report_id: null,
  cancel_reason: null, is_trial: false, is_makeup: false, is_rescheduled: false,
};

describe('attendanceTableSchema (docs/46 C5)', () => {
  it('reads the teacher «سجل الحضور»', () => {
    const table = { month: '2026-11', months: ['2026-11'], items: [row], totals, mine: true };
    expect(attendanceTableSchema.parse(table).items[0]?.kind).toBe('unmarked');
  });

  it('refuses an unknown kind or a missing total', () => {
    const bad = { month: '2026-11', months: [], items: [{ ...row, kind: 'maybe' }], totals, mine: true };
    expect(attendanceTableSchema.safeParse(bad).success).toBe(false);
    const noTotal = { month: '2026-11', months: [], items: [], totals: { held: 1 }, mine: true };
    expect(attendanceTableSchema.safeParse(noTotal).success).toBe(false);
  });
});
