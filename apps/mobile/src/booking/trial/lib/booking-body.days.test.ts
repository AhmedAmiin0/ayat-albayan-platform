import { bookingRequestSchema } from '@ab/shared';
import { toBookingRequest } from './booking-body';
import { draft, SUN_17, THU_18, TUE_17 } from '../../testing/fixtures';
import { fromPicks, picksOf } from '../../shared/picks';

const REQ = '99999999-9999-4999-8999-999999999999';
const riyadh = { pkg: '12' as const, tz: 'Asia/Riyadh' };

test('a package: every pick’s weekday, the earliest pick starts it, dayTimes only for the days at another time', () => {
  const body = toBookingRequest(draft({ ...riyadh, ...fromPicks([THU_18, SUN_17, TUE_17]) }), { requestId: REQ });
  expect(body).toMatchObject({
    kind: 'package',
    byday: [0, 2, 4],
    startTimeLocal: '17:00',
    startsOn: '2026-10-04',
    startsAt: SUN_17,
    dayTimes: [{ weekday: 4, startTimeLocal: '18:00' }],
  });
  expect(bookingRequestSchema.safeParse(body).success).toBe(true);
});

test('a package whose days share one time sends no dayTimes', () => {
  const body = toBookingRequest(draft({ ...riyadh, ...fromPicks([SUN_17, TUE_17]) }), { requestId: REQ });
  expect(body).toMatchObject({ byday: [0, 2], startTimeLocal: '17:00' });
  expect(body).not.toHaveProperty('dayTimes');
});

test('a trial stays one lesson on its slot, whatever extra picks linger', () => {
  const body = toBookingRequest(draft({ extra: [TUE_17] }), { requestId: REQ });
  expect(body).toMatchObject({ kind: 'trial', byday: [0], startTimeLocal: '18:00', startsAt: SUN_17 });
  expect(body).not.toHaveProperty('dayTimes');
});

test('picks ⇄ draft: sorted, the earliest is startsAt; none = nothing picked', () => {
  expect(fromPicks([TUE_17, SUN_17])).toEqual({ startsAt: SUN_17, extra: [TUE_17] });
  expect(fromPicks([])).toEqual({ startsAt: null, extra: [] });
  expect(picksOf({ startsAt: SUN_17, extra: [TUE_17] })).toEqual([SUN_17, TUE_17]);
  expect(picksOf({ startsAt: null, extra: [] })).toEqual([]);
});
