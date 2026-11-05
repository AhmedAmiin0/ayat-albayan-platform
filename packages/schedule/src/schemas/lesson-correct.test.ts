import { describe, expect, it } from 'vitest';
import { lessonCorrectSchema } from './lesson-correct.js';

describe('lessonCorrectSchema', () => {
  it.each(['completed', 'no_show', 'excused', 'cancelled_by_teacher'])('accepts %s', (to) => {
    expect(lessonCorrectSchema.parse({ to })).toEqual({ to });
  });

  it('refuses any other status, a missing one and extra keys', () => {
    expect(lessonCorrectSchema.safeParse({ to: 'late' }).success).toBe(false);
    expect(lessonCorrectSchema.safeParse({ to: 'cancelled_by_admin' }).success).toBe(false);
    expect(lessonCorrectSchema.safeParse({}).success).toBe(false);
    expect(lessonCorrectSchema.safeParse({ to: 'completed', reason: 'x' }).success).toBe(false);
  });
});
