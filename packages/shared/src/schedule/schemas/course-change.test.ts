import { describe, expect, it } from 'vitest';
import {
  courseChangeCheckSchema,
  courseChangeSchema,
  courseTeacherChangeSchema,
  courseTeacherCheckSchema,
} from './course-change.js';

const body = {
  subscriptionId: '00000000-0000-4000-8000-000000000001',
  byday: [0, 2],
  startTimeLocal: '17:00',
  startsOn: '2026-11-01',
  startsAt: '2026-11-01T14:00:00.000Z',
  dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }],
};
const requestId = '00000000-0000-4000-8000-000000000002';

describe('courseChangeSchema', () => {
  it('accepts the picks with their own times', () => {
    expect(courseChangeSchema.safeParse({ ...body, clientRequestId: requestId }).success).toBe(true);
  });
  it('the change needs a clientRequestId; the check does not', () => {
    expect(courseChangeSchema.safeParse(body).success).toBe(false);
    expect(courseChangeCheckSchema.safeParse(body).success).toBe(true);
  });
  it('a day time on a weekday not picked is refused', () => {
    const bad = { ...body, dayTimes: [{ weekday: 4, startTimeLocal: '19:30' }] };
    expect(courseChangeCheckSchema.safeParse(bad).success).toBe(false);
  });
  it('startsAt is required (the change point)', () => {
    const rest: Partial<typeof body> = { ...body };
    delete rest.startsAt;
    expect(courseChangeCheckSchema.safeParse(rest).success).toBe(false);
  });
});

describe('courseTeacherChangeSchema («تغيير المعلم», owner 2026-10-30)', () => {
  const teacherId = '00000000-0000-4000-8000-000000000003';
  it('needs the new teacher; the change also its clientRequestId', () => {
    expect(courseTeacherCheckSchema.safeParse({ ...body, teacherId }).success).toBe(true);
    expect(courseTeacherCheckSchema.safeParse(body).success).toBe(false);
    expect(courseTeacherChangeSchema.safeParse({ ...body, teacherId }).success).toBe(false);
    expect(courseTeacherChangeSchema.safeParse({ ...body, teacherId, clientRequestId: requestId }).success).toBe(true);
  });
  it('keeps the day-time refinement', () => {
    const bad = { ...body, teacherId, dayTimes: [{ weekday: 4, startTimeLocal: '19:30' }] };
    expect(courseTeacherCheckSchema.safeParse(bad).success).toBe(false);
  });
});
