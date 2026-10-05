import { bookingRequestSchema } from '@ab/shared';
import { toBookingRequest } from './booking-body';
import { booked, draft, maryam, SUN_17 } from './fixtures';
import { t } from '@/lib/i18n';
import { effectiveByday, packageDaysNote, subscriptionHref } from './package-choice';

const REQ = '99999999-9999-4999-8999-999999999999';
const paid = draft({ pkg: '12', durationMin: 60, byday: [4, 2], tz: 'Asia/Riyadh' });

test('weekdays: none before a slot; a trial only its day; a package its day plus the picked ones', () => {
  expect(effectiveByday(draft({ startsAt: null }))).toEqual([]);
  expect(effectiveByday(draft({ byday: [2] }))).toEqual([0]); // Sunday's trial ignores extra days
  expect(effectiveByday(paid)).toEqual([0, 2, 4]);
  // Unticking the first lesson's day does not drop it.
  expect(effectiveByday({ ...paid, byday: [2] })).toEqual([0, 2]);
});

test('a paid package: a weekly rule on its days, its length and size, the new child active', () => {
  const body = toBookingRequest(paid, { requestId: REQ });
  expect(body).toMatchObject({
    teacherId: maryam.id,
    byday: [0, 2, 4],
    startTimeLocal: '17:00',
    tz: 'Asia/Riyadh',
    durationMin: 60,
    startsOn: '2026-10-04',
    package: '12',
    clientRequestId: REQ,
    startsAt: SUN_17,
    newStudent: { status: 'active' },
  });
  expect(bookingRequestSchema.safeParse(body).success).toBe(true);
  expect(toBookingRequest(draft(), { requestId: REQ })).toMatchObject({
    package: 'trial',
    durationMin: 45,
    newStudent: { status: 'trial' },
  });
  // A trial takes the form's «المدة» too (30 / 45 / 60 / 90).
  expect(toBookingRequest(draft({ durationMin: 30 }), { requestId: REQ })).toMatchObject({ durationMin: 30 });
});

test('after a paid package: on to its subscription, prefilled; a trial goes nowhere', () => {
  expect(subscriptionHref(paid, booked(SUN_17))).toEqual({
    pathname: '/inbox/subscribe',
    params: {
      studentId: '44444444-4444-4444-8444-444444444444',
      pkg: '12',
      minutes: '60',
      startsOn: '2026-10-04',
    },
  });
  expect(subscriptionHref(draft(), booked(SUN_17))).toBeNull();
  expect(subscriptionHref(paid, { ...booked(SUN_17), student_ids: [] })).toBeNull();
});

describe('packageDaysNote: the package and the weekly days agree (as the web)', () => {
  it('8 a month on one day → «= مرتان في الأسبوع»; matching days or a trial → nothing', () => {
    expect(packageDaysNote('8', 1)).toBe(`الباقة ${t.enums.packageSize['8']} = ${t.booking.perWeek.two}`);
    expect(packageDaysNote('8', 2)).toBeNull();
    expect(packageDaysNote('trial', 1)).toBeNull();
  });
});
