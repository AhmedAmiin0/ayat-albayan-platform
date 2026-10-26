import { SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { fakeSettings, readerOf } from '../../../common/settings/settings.fakes';
import { BookingSettings, type BookingSettingsValues } from './booking.settings';

/** Pinned by hand: every key the booking consumers read (BookingPlanner … SalesBookingScope). */
const EXPECTED = [
  'booking_horizon_weeks',
  'makeup_window_days',
  'teachers_always_available',
  'meeting_link_auto',
  'upload_max_mb',
  'sales_auto_assign',
] as const;

describe('BookingSettings', () => {
  it('reads exactly the keys its consumers use, with the registry defaults', async () => {
    const values = await readerOf(BookingSettings).read();
    expect(Object.keys(values)).toEqual(EXPECTED);
    expect(values).toEqual(Object.fromEntries(EXPECTED.map((k) => [k, SETTING_DEFAULTS[k]])));
    expectTypeOf<keyof BookingSettingsValues>().toEqualTypeOf<(typeof EXPECTED)[number]>();
  });

  it('an over value comes through, from one store read', async () => {
    const over = { makeup_window_days: 10, sales_auto_assign: false } as const;
    expect(await readerOf(BookingSettings, over).read()).toMatchObject(over);
    const store = fakeSettings();
    await new BookingSettings(store).read();
    expect(store.all).toHaveBeenCalledTimes(1);
  });
});
