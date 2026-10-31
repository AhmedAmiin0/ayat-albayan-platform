import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { joinError, opensAtLine } from './join-text';

test.each([
  'classroom_not_configured',
  'join_not_open_yet',
  'join_closed',
  'forbidden',
  'lesson_not_found',
])('%s reads in words', (code) => {
  const text: Record<string, string> = t.classroom.error;
  expect(joinError(new ApiError(403, { code, message: code }))).toBe(text[code]);
});

test('an unknown code or a non-API error reads «unknown»', () => {
  expect(joinError(new ApiError(500, { code: 'boom' }))).toBe(t.classroom.error.unknown);
  expect(joinError(new Error('network'))).toBe(t.classroom.error.unknown);
});

test('the opening time is on the Riyadh clock (UTC+3)', () => {
  const line = opensAtLine('2026-10-03T12:45:00.000Z', '24', 'Asia/Riyadh');
  expect(line).toBe(t.classroom.opensAt.replace('{time}', '15:45'));
});
