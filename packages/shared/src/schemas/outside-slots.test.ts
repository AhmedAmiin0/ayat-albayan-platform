import { describe, expect, it } from 'vitest';
import { outsideSlotsResponseSchema } from './outside-slots';

const valid = {
  server_now: '2026-10-01T08:00:00.000Z',
  teacher_tz: 'Africa/Cairo',
  step_min: 30,
  slots: [
    {
      starts_at: '2026-10-03T09:00:00.000Z',
      ends_at: '2026-10-03T09:45:00.000Z',
      inside_hours: false,
    },
  ],
};

describe('GET /booking/outside-slots response (owner 2026-11-21, «وقت آخر»)', () => {
  it('parses the server instants and the inside_hours flag', () => {
    expect(outsideSlotsResponseSchema.parse(valid)).toEqual(valid);
  });

  it('refuses a free-text time, a missing server_now or a missing flag', () => {
    const slot = valid.slots[0];
    expect(outsideSlotsResponseSchema.safeParse({ ...valid, server_now: 'noon' }).success).toBe(
      false,
    );
    expect(outsideSlotsResponseSchema.safeParse({ ...valid, server_now: undefined }).success).toBe(
      false,
    );
    expect(
      outsideSlotsResponseSchema.safeParse({ ...valid, slots: [{ ...slot, starts_at: '12:00' }] })
        .success,
    ).toBe(false);
    expect(
      outsideSlotsResponseSchema.safeParse({
        ...valid,
        slots: [{ ...slot, inside_hours: undefined }],
      }).success,
    ).toBe(false);
  });
});
