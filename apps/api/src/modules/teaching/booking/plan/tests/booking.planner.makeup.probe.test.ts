import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Schedule from '@ab/schedule';
import { probeOccurrences as scheduleProbe } from '@ab/schedule';
import { probeOccurrences as sharedProbe } from '@ab/shared';
import { bookingRequest, fakePlanner, IDS, NOW } from '@/modules/teaching/booking/booking.fakes';
import { makeupRequest, missedLessonRow } from '@/modules/teaching/booking/core/makeup/booking.makeup.fakes';

// One spy behind both paths, so the planner is watched whichever one it imports.
const probe = vi.hoisted(() => vi.fn<typeof Schedule.probeOccurrences>());
vi.mock('@ab/shared', async (load) => ({ ...(await load<object>()), probeOccurrences: probe }));
vi.mock('@ab/schedule', async (load) => ({ ...(await load<object>()), probeOccurrences: probe }));

// A trial and a makeup are one lesson: there is no series whose later weeks a DST change could move.
describe('BookingPlanner — the DST probe is for a package only (R-SCH-10)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    probe.mockReset().mockReturnValue([]);
  });
  afterEach(() => vi.useRealTimers());

  it.each([
    ['a makeup', makeupRequest(), 0],
    ['a trial', bookingRequest({ package: 'trial', studentIds: [IDS.s1] }), 0],
    ['a package', bookingRequest(), 1],
  ])('%s → %i probe calls', async (_name, req, calls) => {
    const { planner, queries } = fakePlanner();
    queries.makeupOriginal.mockResolvedValue(missedLessonRow());
    await planner.prepare(req);
    expect(scheduleProbe).toBe(probe);
    expect(sharedProbe).toBe(probe);
    expect(probe).toHaveBeenCalledTimes(calls);
  });
});
