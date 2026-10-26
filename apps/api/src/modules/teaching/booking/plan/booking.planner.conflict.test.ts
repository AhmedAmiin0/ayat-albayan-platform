import { HttpException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bookingRequest, fakePlanner, IDS, NOW } from '../booking.fakes';

const lesson = (id: string, start: string, end: string) => ({
  id,
  starts_at: new Date(start),
  ends_at: new Date(end),
});
const failure = async (p: Promise<unknown>) => {
  const err = await p.catch((e: unknown) => e);
  if (!(err instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: err.getStatus(), body: err.getResponse() };
};

describe('BookingPlanner — conflicts (R-SCH-04, issue B3)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('409 { code: conflict } lists every clashing occurrence of the series', async () => {
    const { planner, busy } = fakePlanner();
    busy.teacherLessons.mockResolvedValue([
      lesson('T1', '2026-10-11T14:30:00Z', '2026-10-11T15:15:00Z'),
    ]);
    busy.studentLessons.mockResolvedValue([
      { ...lesson('S9', '2026-10-25T13:30:00Z', '2026-10-25T14:15:00Z'), student_id: IDS.s2 },
    ]);
    const { status, body } = await failure(planner.prepare(bookingRequest()));
    expect(status).toBe(409);
    expect(body).toEqual({
      code: 'conflict',
      message: 'conflict',
      conflicts: [
        {
          kind: 'teacher_busy',
          startsAt: '2026-10-11T14:00:00.000Z',
          endsAt: '2026-10-11T14:45:00.000Z',
          lessonId: 'T1',
        },
        {
          kind: 'student_busy',
          startsAt: '2026-10-25T14:00:00.000Z',
          endsAt: '2026-10-25T14:45:00.000Z',
          lessonId: 'S9',
          studentId: IDS.s2,
        },
      ],
    });
  });

  it('time-off and a slot outside the grid block too', async () => {
    const { planner, availability } = fakePlanner();
    availability.listTimeOff.mockResolvedValue([
      { starts_at: '2026-10-18T00:00:00Z', ends_at: '2026-10-19T00:00:00Z' },
    ]);
    const { body } = await failure(planner.prepare(bookingRequest({ startTimeLocal: '23:00' })));
    const kinds = new Set((body as { conflicts: { kind: string }[] }).conflicts.map((c) => c.kind));
    expect(kinds).toEqual(new Set(['outside_availability', 'time_off']));
  });

  it('with override.reason the booking goes ahead; only the clashing lesson keeps the reason', async () => {
    const { planner, busy } = fakePlanner();
    busy.teacherLessons.mockResolvedValue([
      lesson('T1', '2026-10-11T14:00:00Z', '2026-10-11T14:45:00Z'),
    ]);
    const reason = 'ولي الأمر طلب الميعاد ده بالذات';
    const { payload, conflicts } = await planner.prepare(bookingRequest({ override: { reason } }));
    expect(conflicts.map((c) => c.kind)).toEqual(['teacher_busy']);
    expect(payload.lessons.filter((l) => l.override_reason === reason).map((l) => l.starts_at)).toEqual([
      '2026-10-11T14:00:00.000Z',
    ]);
    expect(payload.lessons.filter((l) => l.override_reason === null)).toHaveLength(4);
  });

  it('conflicts() returns the same clashes without throwing (the wizard check before review)', async () => {
    const { planner, busy } = fakePlanner();
    busy.teacherLessons.mockResolvedValue([lesson('T1', '2026-10-11T14:00:00Z', '2026-10-11T14:45:00Z')]);
    expect((await planner.conflicts(bookingRequest())).map((c) => [c.kind, c.startsAt])).toEqual([
      ['teacher_busy', '2026-10-11T14:00:00.000Z'],
    ]);
  });

  it('400 no_occurrences when startsOn is past the horizon', async () => {
    const { planner } = fakePlanner();
    const { status, body } = await failure(planner.prepare(bookingRequest({ startsOn: '2027-01-03' })));
    expect([status, body]).toEqual([400, { code: 'no_occurrences', message: 'no_occurrences' }]);
  });
});
