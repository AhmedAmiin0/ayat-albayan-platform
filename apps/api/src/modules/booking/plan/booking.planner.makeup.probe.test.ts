import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { probeOccurrences } from '../../scheduling/occurrences/dst-probe';
import { bookingRequest, fakePlanner, IDS, NOW } from '../booking.fakes';
import { makeupRequest, missedLessonRow } from '../makeup/booking.makeup.fakes';

vi.mock('../../scheduling/occurrences/dst-probe', () => ({ probeOccurrences: vi.fn(() => []) }));

// A trial and a makeup are one lesson: there is no series whose later weeks a DST change could move.
describe('BookingPlanner — the DST probe is for a package only (R-SCH-10)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: NOW, toFake: ['Date'] });
    vi.mocked(probeOccurrences).mockClear();
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
    expect(probeOccurrences).toHaveBeenCalledTimes(calls);
  });
});
