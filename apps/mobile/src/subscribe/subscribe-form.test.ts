import { subscriptionCreateSchema } from '@ab/shared';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import {
  INITIAL_FORM,
  pricingOf,
  startDayLabel,
  startDays,
  subscribeErrorText,
} from './subscribe-form';

const STUDENT = '44444444-4444-4444-8444-444444444444';
/** Friday 2 Oct 2026, 12:00 in Riyadh. */
const NOW = new Date('2026-10-02T09:00:00Z');

test('the default: «الباقة المتقدمة», 45 minutes, no discount, priced in the guardian’s country', () => {
  expect(pricingOf(INITIAL_FORM)).toEqual({ duration: 45, discount: 0, tier: 'standard' });
});

test('a custom count, another country and an Arabic-keypad discount: a valid POST /subscriptions', () => {
  const pricing = pricingOf({
    ...INITIAL_FORM,
    plan: 'custom',
    count: 10,
    country: 'AE',
    duration: '60',
    discount: '١٢٫٥',
  });
  expect(pricing).toEqual({ duration: 60, discount: 12.5, country: 'AE', count: 10 });
  const body = { studentId: STUDENT, pricing, startsOn: '2026-10-03' };
  expect(subscriptionCreateSchema.safeParse(body).success).toBe(true);
});

test('start days: today and the next 6 in the family zone; the booked day leads when outside', () => {
  const days = startDays(NOW, 'Asia/Riyadh');
  expect(days).toEqual([
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06',
    '2026-10-07',
    '2026-10-08',
  ]);
  // 22:00 UTC is already Saturday in Riyadh, still Friday in New York: the family's own today.
  const late = new Date('2026-10-02T22:00:00Z');
  expect(startDays(late, 'Asia/Riyadh')[0]).toBe('2026-10-03');
  expect(startDays(late, 'America/New_York')[0]).toBe('2026-10-02');
  expect(startDays(NOW, 'Asia/Riyadh', '2026-10-20')[0]).toBe('2026-10-20');
  expect(startDays(NOW, 'Asia/Riyadh', '2026-10-04')).toHaveLength(7);
});

test('day chips: «اليوم», then the weekday and date in Western digits', () => {
  expect(startDayLabel('2026-10-02', '2026-10-02')).toBe(t.mobile.today);
  expect(startDayLabel('2026-10-04', '2026-10-02')).toBe('الأحد 4 أكتوبر');
});

test('errors: a save with no answer is honest; a quote offline is a plain error; API codes', () => {
  const offline = new TypeError('Network request failed');
  expect(subscribeErrorText(offline, 'save')).toBe(t.subscriptions.mobile.offline);
  expect(subscribeErrorText(offline, 'quote')).toBe(t.common.error);
  const fx = new ApiError(503, { code: 'fx_unavailable' });
  expect(subscribeErrorText(fx, 'quote')).toBe(t.subscriptions.error.fx_unavailable);
  expect(subscribeErrorText(new ApiError(500, null), 'save')).toBe(t.common.error);
  expect(subscribeErrorText(new ApiError(400, { code: 'nope' }), 'save')).toBe(t.common.error);
});
