import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { probeOccurrences } from '../scheduling/dst-probe';
import { bookingRequest, fakePlanner, NOW } from './booking.fakes';

vi.mock('../scheduling/dst-probe', async (load) => {
  const real = await load<typeof import('../scheduling/dst-probe')>();
  return { ...real, probeOccurrences: vi.fn(real.probeOccurrences) };
});

const TWO_TIMES = { byday: [0, 2], dayTimes: [{ weekday: 2, startTimeLocal: '19:30' }] };

describe('BookingPlanner — a time per weekday (owner 2026-10-18, R-SCH-04, R-SCH-06)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    vi.mocked(probeOccurrences).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('an old body: one rule, siblings [], no day_times in the audit', async () => {
    const { planner } = fakePlanner();
    const { payload } = await planner.prepare(bookingRequest());
    expect(payload.siblings).toEqual([]);
    expect(payload.rule).toMatchObject({ byday: [0], start_time_local: '17:00', ends_on: null, client_request_id: null });
    expect(payload.lessons).toHaveLength(5);
    expect(payload.audit.after).not.toHaveProperty('day_times');
  });

  it('Sun 17:00 + Tue 19:30: the first rule is Sunday’s, Tuesday is a sibling with the same package and lessons', async () => {
    const { planner } = fakePlanner();
    const clientRequestId = 'c0000000-0000-4000-8000-0000000000c1';
    const { payload } = await planner.prepare(bookingRequest({ ...TWO_TIMES, clientRequestId }));
    expect(payload.rule).toMatchObject({ byday: [0], start_time_local: '17:00', package: '8', client_request_id: clientRequestId });
    expect(payload.siblings).toHaveLength(1);
    const [sibling] = payload.siblings ?? [];
    expect(sibling?.rule).toEqual({
      byday: [2],
      start_time_local: '19:30',
      duration_min: 45,
      tz: 'Asia/Riyadh',
      starts_on: '2026-10-01',
      ends_on: null,
      meeting_link: null,
      package: '8',
    });
    expect(sibling?.lessons[0]).toMatchObject({ starts_at: '2026-10-06T16:30:00.000Z', override_reason: null });
    expect(payload.audit.after).toMatchObject({ day_times: [{ weekday: 2, start_time_local: '19:30' }] });
    // One confirmation per guardian, naming the first lesson of the whole booking.
    expect(payload.messages).toHaveLength(1);
  });

  it('one conflict check over every time’s lessons, and one DST probe per time', async () => {
    const { planner, busy } = fakePlanner();
    await planner.prepare(bookingRequest(TWO_TIMES));
    expect(busy.teacherLessons).toHaveBeenCalledTimes(1);
    expect(vi.mocked(probeOccurrences).mock.calls.map(([p]) => p.timing.start_time_local)).toEqual(['17:00', '19:30']);
  });

  it('endsOn caps both rules and drops the lessons after it; the check runs with the same cap', async () => {
    const { planner } = fakePlanner();
    const req = bookingRequest({ ...TWO_TIMES, startsOn: '2026-10-04' });
    const { payload } = await planner.prepare(req, { endsOn: '2026-10-27' });
    expect([payload.rule.ends_on, payload.siblings?.[0]?.rule.ends_on]).toEqual(['2026-10-27', '2026-10-27']);
    expect(payload.lessons.length + (payload.siblings?.[0]?.lessons.length ?? 0)).toBe(8);
    expect(await planner.conflicts(req, { endsOn: '2026-10-27' })).toEqual([]);
  });

  it('a clash on the sibling’s day is a 409 like any other', async () => {
    const { planner, busy } = fakePlanner();
    busy.teacherLessons.mockResolvedValue([
      { id: 'T1', starts_at: new Date('2026-10-13T16:30:00Z'), ends_at: new Date('2026-10-13T17:15:00Z') },
    ]);
    await expect(planner.prepare(bookingRequest(TWO_TIMES))).rejects.toMatchObject({ response: { code: 'conflict' } });
  });
});
