import { describe, expect, it } from 'vitest';
import { bookingBaseSchema } from './scheduling';

const RULE = {
  teacherId: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11',
  byday: [6],
  startTimeLocal: '12:00',
  tz: 'Asia/Riyadh',
  durationMin: 45,
  startsOn: '2026-12-05',
  package: 'trial',
};

describe('booking body outsideHours («وقت آخر», owner 2026-11-21)', () => {
  it('keeps a boolean flag and leaves it out when absent', () => {
    expect(bookingBaseSchema.parse({ ...RULE, outsideHours: true }).outsideHours).toBe(true);
    expect(bookingBaseSchema.parse(RULE)).not.toHaveProperty('outsideHours');
  });

  it('refuses anything but a boolean', () => {
    expect(bookingBaseSchema.safeParse({ ...RULE, outsideHours: 'yes' }).success).toBe(false);
    expect(bookingBaseSchema.safeParse({ ...RULE, outsideHours: 1 }).success).toBe(false);
  });
});
