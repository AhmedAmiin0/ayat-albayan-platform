import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readerOf } from '@/common/settings/settings.fakes';
import { fakeQueries, IDS, NOW } from '@/modules/teaching/booking/booking.fakes';
import { makeupRequest, missedLessonRow } from '@/modules/teaching/booking/makeup/booking.makeup.fakes';
import { BookingParties } from './booking.parties';
import type { BookingRepo } from './booking.repo';
import { BookingSettings } from '@/modules/teaching/booking/booking.settings';

/** 92 days before NOW: too old for the default 60-day window. */
const OLD = missedLessonRow({ starts_at: '2026-07-01T14:00:00Z' });

function parties(windowDays?: number) {
  const queries = fakeQueries();
  queries.makeupOriginal.mockResolvedValue(OLD);
  const settings = readerOf(BookingSettings, windowDays === undefined ? {} : { makeup_window_days: windowDays });
  return new BookingParties(queries as unknown as BookingRepo, settings);
}

describe('BookingParties.missed follows settings.makeup_window_days (R-SCH-10)', () => {
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('60 days by default: a 92-day-old miss is 409 too_old', async () => {
    await expect(parties().missed(makeupRequest())).rejects.toMatchObject({ response: { reason: 'too_old' } });
  });

  it('a 120-day window lets the same miss be made up', async () => {
    expect(await parties(120).missed(makeupRequest())).toBe(IDS.missed);
  });
});
