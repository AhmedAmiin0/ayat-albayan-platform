import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, NOW } from '@/modules/teaching/booking/booking.fakes';

const failure = async (p: Promise<unknown>) => {
  const err = await p.catch((e: unknown) => e);
  if (!(err instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: err.getStatus(), body: err.getResponse() };
};
/** Sat 2026-10-03 12:00 Riyadh (09:00Z): outside the teacher's Sun + Tue 16:00–22:00 Cairo grid. */
const noonTrial = (over: Record<string, unknown> = {}) =>
  bookingRequest({
    package: 'trial',
    byday: [6],
    startsOn: '2026-10-03',
    startTimeLocal: '12:00',
    startsAt: '2026-10-03T09:00:00Z',
    ...over,
  });
const kinds = (body: unknown) =>
  (body as { conflicts: { kind: string }[] }).conflicts.map((c) => c.kind);

describe('BookingPlanner — «وقت آخر» outside the teacher hours (owner 2026-11-21)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('without the flag a start outside the hours is still refused (old behaviour)', async () => {
    const { planner } = fakePlanner();
    const { status, body } = await failure(planner.prepare(noonTrial()));
    expect(status).toBe(409);
    expect(kinds(body)).toEqual(['outside_availability']);
    expect(await planner.conflicts(noonTrial())).toHaveLength(1);
  });

  it('outsideHours skips only the availability check and records it in the audit row', async () => {
    const { planner } = fakePlanner();
    const { payload, conflicts } = await planner.prepare(noonTrial({ outsideHours: true }));
    expect(conflicts).toEqual([]);
    expect(payload.lessons.map((l) => l.starts_at)).toEqual(['2026-10-03T09:00:00.000Z']);
    expect(payload.audit.after).toMatchObject({ outside_hours: true, conflicts: [] });
    expect(await planner.conflicts(noonTrial({ outsideHours: true }))).toEqual([]);
  });

  it('a clash is still refused with the flag (teacher lesson, time off)', async () => {
    const { planner, busy, availability } = fakePlanner();
    const at = {
      starts_at: new Date('2026-10-03T09:30:00Z'),
      ends_at: new Date('2026-10-03T10:00:00Z'),
    };
    busy.teacherLessons.mockResolvedValue([{ id: 'T1', ...at }]);
    availability.listTimeOff.mockResolvedValue([
      { starts_at: '2026-10-03T08:00:00Z', ends_at: '2026-10-03T09:15:00Z' },
    ]);
    const { status, body } = await failure(planner.prepare(noonTrial({ outsideHours: true })));
    expect(status).toBe(409);
    expect(kinds(body)).toEqual(['time_off', 'teacher_busy']);
  });

  it('a past start is refused with the flag, by the server clock (400 date_in_past)', async () => {
    const { planner } = fakePlanner();
    const past = {
      byday: [3],
      startsOn: '2026-09-30',
      startsAt: '2026-09-30T09:00:00Z',
      outsideHours: true,
    };
    const { status, body } = await failure(planner.prepare(noonTrial(past)));
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'date_in_past' });
    await expect(planner.conflicts(noonTrial(past))).rejects.toThrow(HttpException);
  });

  it('the audit row has no outside_hours key without the flag', async () => {
    const { planner } = fakePlanner();
    const { payload } = await planner.prepare(bookingRequest());
    expect(payload.audit.after).not.toHaveProperty('outside_hours');
  });
});
