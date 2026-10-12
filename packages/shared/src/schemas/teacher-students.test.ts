import { describe, expect, it } from 'vitest';
import { TEACHER_STUDENT_STATUSES, teacherStudentsQuerySchema } from './teacher-students.js';

describe('teacherStudentsQuerySchema', () => {
  it.each(['subscribed', 'trial'])('accepts kind=%s', (kind) => {
    expect(teacherStudentsQuerySchema.parse({ kind })).toEqual({ kind });
  });

  it.each([{}, { kind: 'all' }, { kind: 'active' }, { kind: ['trial', 'subscribed'] }])('refuses %j', (q) => {
    expect(teacherStudentsQuerySchema.safeParse(q).success).toBe(false);
  });

  it('maps subscribed to active + pending_renewal and trial to trial only', () => {
    expect(TEACHER_STUDENT_STATUSES).toEqual({ subscribed: ['active', 'pending_renewal'], trial: ['trial'] });
  });

  it('pending_renewal stays the teacher’s (subscribed list), paused / churned in neither list', () => {
    const all = Object.values(TEACHER_STUDENT_STATUSES).flat();
    expect(all).toContain('pending_renewal');
    expect(all).not.toContain('paused');
    expect(all).not.toContain('churned');
  });
});
