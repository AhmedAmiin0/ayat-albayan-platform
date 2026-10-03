import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { editTimeFailure, failureCode, isStale } from './edit-time-errors';

const api = (status: number, code: string, extra: object = {}) => new ApiError(status, { code, ...extra });
const own: Record<string, string> = t.editTime.error;

test('offline: not sure the edit landed (a TypeError, no HTTP answer)', () => {
  expect(editTimeFailure(new TypeError('Network request failed'))).toEqual({ kind: 'error', text: t.editTime.offline });
});

test('a clash comes back as lines, in booking’s wording', () => {
  const clash = { kind: 'teacher_busy', startsAt: '2026-10-03T14:00:00.000Z', endsAt: '2026-10-03T14:45:00.000Z' };
  expect(editTimeFailure(api(409, 'conflict', { conflicts: [clash] }))).toEqual({
    kind: 'conflict',
    lines: [t.booking.conflict.teacher_busy.replace('{when}', 'السبت 3 أكتوبر 17:00')],
  });
});

test.each(Object.keys(own))('%s says its own line', (code) => {
  expect(editTimeFailure(api(409, code))).toEqual({ kind: 'error', text: own[code] });
});

test('the older codes keep lessons.error wording; an unknown one is the general error', () => {
  expect(editTimeFailure(api(400, 'date_in_past'))).toEqual({ kind: 'error', text: t.lessons.error.date_in_past });
  expect(editTimeFailure(api(500, 'boom'))).toEqual({ kind: 'error', text: t.common.error });
  expect(editTimeFailure(new ApiError(502))).toEqual({ kind: 'error', text: t.common.error });
});

test('only a lesson that changed under us makes the lists refetch', () => {
  expect(isStale(api(409, 'stale_time'))).toBe(true);
  expect(isStale(api(409, 'time_edit_not_allowed'))).toBe(true);
  expect(isStale(api(409, 'conflict'))).toBe(false);
  expect(failureCode(new TypeError('x'))).toBeUndefined();
});
