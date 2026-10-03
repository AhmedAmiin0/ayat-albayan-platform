import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { earningsErrorText } from './earnings-errors';

const codes = Object.keys(t.teacherEarnings.error) as (keyof typeof t.teacherEarnings.error)[];

test.each(codes)('API code %s → its teacherEarnings.error wording', (code) => {
  expect(earningsErrorText(new ApiError(400, { code }))).toBe(t.teacherEarnings.error[code]);
});

test('over_payment on 409 and 400 read the same', () => {
  expect(earningsErrorText(new ApiError(409, { code: 'over_payment' }))).toBe(t.teacherEarnings.error.over_payment);
});

test('unknown code, no body, or a non-API error → the generic error', () => {
  expect(earningsErrorText(new ApiError(500, { code: 'boom' }))).toBe(t.common.error);
  expect(earningsErrorText(new ApiError(500))).toBe(t.common.error);
  expect(earningsErrorText(new Error('x'))).toBe(t.common.error);
});

test('no answer from the network says the connection dropped', () => {
  expect(earningsErrorText(new TypeError('Network request failed'))).toBe(t.payments.mobile.offline);
});
