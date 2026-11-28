import { describe, expect, it } from 'vitest';
import { conflictSchema } from './conflicts.schemas';

const AT = { startsAt: '2026-10-05T14:00:00.000Z', endsAt: '2026-10-05T14:45:00.000Z' };
const LESSON = '00000000-0000-4000-8000-0000000000b1';
const STUDENT = '00000000-0000-4000-8000-0000000000c1';

describe('conflictSchema (R-SCH-04)', () => {
  it('reads each kind, with the busy lesson and student when there are any', () => {
    const busy = { kind: 'student_busy', ...AT, lessonId: LESSON, studentId: STUDENT };
    expect(conflictSchema.parse(busy)).toEqual(busy);
    expect(conflictSchema.parse({ kind: 'outside_availability', ...AT })).toEqual({
      kind: 'outside_availability',
      ...AT,
    });
  });

  it('refuses an unknown kind, a time without its offset or a lesson that is not an id', () => {
    expect(conflictSchema.safeParse({ kind: 'room_busy', ...AT }).success).toBe(false);
    const local = { ...AT, startsAt: '2026-10-05T14:00:00' };
    expect(conflictSchema.safeParse({ kind: 'time_off', ...local }).success).toBe(false);
    const bad = { kind: 'teacher_busy', ...AT, lessonId: 'x' };
    expect(conflictSchema.safeParse(bad).success).toBe(false);
  });
});
