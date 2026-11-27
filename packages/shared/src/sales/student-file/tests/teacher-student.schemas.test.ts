import { describe, expect, it } from 'vitest';
import { teacherStudentHeadSchema as head } from '../teacher-student.schemas';

const ID = '11111111-1111-4111-8111-111111111111';
const row = {
  lesson_id: ID,
  starts_at: '2026-11-20T10:00:00.000Z',
  duration_min: 30,
  teacher_name: null,
  status: 'cancelled_by_admin',
  attendance: null,
  kind: null,
  report_sent: false,
  report_id: null,
  cancel_reason: 'سفر',
  is_trial: false,
  is_makeup: false,
  is_rescheduled: false,
  moved_from: null,
  moved_to: null,
  move_reason: null,
};
const course = {
  starts_on: '2026-10-01',
  stopped_at: null,
  ended_at: null,
  projected_end_at: '2026-12-01T10:00:00.000Z',
  lessons_total: 8,
  lessons_used: 3,
  lessons_remaining: 5,
};
const file = { id: ID, code: 'AB-0001', name: 'طالب', status: 'active', course, upcoming: [row] };

describe('teacherStudentHeadSchema', () => {
  it('reads the head with or without a course', () => {
    expect(head.parse(file).upcoming[0]?.cancel_reason).toBe('سفر');
    expect(head.parse({ ...file, course: null }).course).toBeNull();
  });

  it('refuses money, an unknown status or a negative count', () => {
    expect(head.safeParse({ ...file, price: 100 }).success).toBe(false);
    expect(head.safeParse({ ...file, course: { ...course, price: 1 } }).success).toBe(false);
    expect(head.safeParse({ ...file, status: 'x' }).success).toBe(false);
    const left = { ...course, lessons_remaining: -1 };
    expect(head.safeParse({ ...file, course: left }).success).toBe(false);
  });

  it('refuses a start day that is not a calendar date', () => {
    const bad = { ...file, course: { ...course, starts_on: '2026-10-01T00:00:00Z' } };
    expect(head.safeParse(bad).success).toBe(false);
  });
});
