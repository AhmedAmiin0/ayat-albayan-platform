import { describe, expect, it } from 'vitest';
import { TEACHER_STUDENT_STATUS, teacherStudentsQuerySchema } from './teacher-students.js';

describe('teacherStudentsQuerySchema', () => {
  it.each(['subscribed', 'trial'])('accepts kind=%s', (kind) => {
    expect(teacherStudentsQuerySchema.parse({ kind })).toEqual({ kind });
  });

  it.each([{}, { kind: 'all' }, { kind: 'active' }, { kind: ['trial', 'subscribed'] }])('refuses %j', (q) => {
    expect(teacherStudentsQuerySchema.safeParse(q).success).toBe(false);
  });

  it('maps subscribed to active and trial to trial', () => {
    expect(TEACHER_STUDENT_STATUS).toEqual({ subscribed: 'active', trial: 'trial' });
  });
});
