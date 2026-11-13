import { describe, expect, it } from 'vitest';
import { teacherStudentHeadSchema } from './teacher-student-head-schema.js';

const row = {
  lesson_id: 'l1', starts_at: '2026-11-20T10:00:00.000Z', duration_min: 30, teacher_name: null,
  status: 'cancelled_by_admin', attendance: null, kind: null, report_sent: false, report_id: null,
  cancel_reason: 'سفر', is_trial: false, is_makeup: false, is_rescheduled: false,
};
const course = {
  starts_on: '2026-10-01', stopped_at: null, ended_at: null, projected_end_at: null,
  lessons_total: 8, lessons_used: 3, lessons_remaining: 5,
};
const head = { id: 's1', code: 'AB-0001', name: 'طالب', status: 'active', course, upcoming: [row] };

describe('teacherStudentHeadSchema (docs/47)', () => {
  it('reads the head with and without a course', () => {
    expect(teacherStudentHeadSchema.parse(head).upcoming[0]?.cancel_reason).toBe('سفر');
    expect(teacherStudentHeadSchema.parse({ ...head, course: null }).course).toBeNull();
  });

  it('strips unknown keys such as money', () => {
    const parsed = teacherStudentHeadSchema.parse({ ...head, price: 100 });
    expect(parsed).not.toHaveProperty('price');
  });

  it('refuses a negative count or an unknown status', () => {
    const bad = { ...head, course: { ...course, lessons_remaining: -1 } };
    expect(teacherStudentHeadSchema.safeParse(bad).success).toBe(false);
    expect(teacherStudentHeadSchema.safeParse({ ...head, status: 'x' }).success).toBe(false);
  });
});
