import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { rescheduleFailure } from './reschedule-errors';

test('409 conflict: one Arabic line per clash in Riyadh time', () => {
  const error = new ApiError(409, {
    code: 'conflict',
    conflicts: [
      { kind: 'teacher_busy', startsAt: '2026-10-03T14:00:00.000Z' },
      { kind: 'nonsense', startsAt: 'x' },
    ],
  });
  expect(rescheduleFailure(error, '24')).toEqual({
    kind: 'conflict',
    lines: [t.booking.conflict.teacher_busy.replace('{when}', 'السبت 3 أكتوبر 17:00')],
  });
});

test.each([
  ['invalid_transition', 409],
  ['no_rule', 400],
  ['rule_not_active', 409],
  ['date_in_past', 400],
  ['no_occurrences', 400],
] as const)('%s reads as its lessons.error line', (code, status) => {
  expect(rescheduleFailure(new ApiError(status, { code }), '24')).toEqual({ kind: 'error', text: t.lessons.error[code] });
});

test('offline: not sure it landed, so say so (a retry after a landed move is refused, not doubled)', () => {
  expect(rescheduleFailure(new TypeError('Network request failed'), '24')).toEqual({
    kind: 'error',
    text: t.reschedule.offline,
  });
});

test('anything else: the general error', () => {
  expect(rescheduleFailure(new ApiError(500), '24')).toEqual({ kind: 'error', text: t.common.error });
  expect(rescheduleFailure(new ApiError(400, { code: 'validation_failed' }), '24')).toEqual({
    kind: 'error',
    text: t.common.error,
  });
  expect(rescheduleFailure(new Error('boom'), '24')).toEqual({ kind: 'error', text: t.common.error });
});
