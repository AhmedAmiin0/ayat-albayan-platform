import { describe, expect, it } from 'vitest';
import { outcomeChange, type OutcomeInput } from './outcomes';

const lesson = { id: 'L1', status: 'confirmed' as const, starts_at: '2026-10-04T14:00:00Z' };
const base: OutcomeInput = {
  lesson,
  to: 'completed',
  event: 'complete',
  now: new Date('2026-10-04T15:00:00Z'),
  lateCancelHours: null,
};

describe('outcomeChange — attendance outcomes (R-SCH-03, R-SCH-07, R-STU-04)', () => {
  it('one outcome for everyone: status, attendance and chargeable on the lesson', () => {
    expect(outcomeChange(base)).toEqual({
      id: 'L1',
      from_status: 'confirmed',
      to_status: 'completed',
      attendance: 'on_time',
      chargeable: true,
    });
  });

  it('a sibling absent in a completed group lesson: absent and still charged (no_show consumes)', () => {
    const change = outcomeChange({ ...base, students: [{ studentId: 'S2', event: 'mark_no_show' }] });
    expect(change.students).toEqual([{ student_id: 'S2', attendance: 'absent', chargeable: true }]);
    expect(change).toMatchObject({ to_status: 'completed', attendance: 'on_time', chargeable: true });
  });

  it('a sibling excused: not charged while late-cancel is OFF', () => {
    const change = outcomeChange({ ...base, students: [{ studentId: 'S2', event: 'excuse' }] });
    expect(change.students).toEqual([{ student_id: 'S2', attendance: 'excused', chargeable: false }]);
  });

  it('a late excuse is charged once the owner sets late_cancel_hours', () => {
    const late = { ...base, lateCancelHours: 24, now: new Date('2026-10-04T10:00:00Z') };
    const change = outcomeChange({ ...late, students: [{ studentId: 'S2', event: 'excuse' }] });
    expect(change.students?.[0]?.chargeable).toBe(true);
  });

  it('the lesson-wide outcome decides the lesson status and the default for the rest', () => {
    const change = outcomeChange({ ...base, to: 'late', event: 'mark_late' });
    expect(change).toMatchObject({ to_status: 'late', attendance: 'late', chargeable: true });
    expect(change.students).toBeUndefined();
  });
});
