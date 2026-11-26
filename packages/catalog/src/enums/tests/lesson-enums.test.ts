import { describe, expect, expectTypeOf, it } from 'vitest';
import type { z } from 'zod';
import {
  ATTENDANCES,
  attendanceSchema,
  LESSON_STATUSES,
  lessonStatusSchema,
  type Attendance,
  type LessonStatus,
} from '..';

describe('lesson status and attendance schemas', () => {
  it('accept each member of their tuple and nothing else', () => {
    expect(lessonStatusSchema.options).toEqual([...LESSON_STATUSES]);
    expect(attendanceSchema.options).toEqual([...ATTENDANCES]);
    expect(lessonStatusSchema.validate('done')).toBe(false);
    expect(attendanceSchema.validate(null)).toBe(false);
  });

  it('give the same types as the tuples', () => {
    expectTypeOf<z.infer<typeof lessonStatusSchema>>().toEqualTypeOf<LessonStatus>();
    expectTypeOf<z.infer<typeof attendanceSchema>>().toEqualTypeOf<Attendance>();
  });
});
