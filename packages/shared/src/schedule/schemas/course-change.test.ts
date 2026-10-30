import { describe, expect, it } from 'vitest';
import { courseChangeCheckSchema, courseChangeSchema } from './course-change.js';

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
