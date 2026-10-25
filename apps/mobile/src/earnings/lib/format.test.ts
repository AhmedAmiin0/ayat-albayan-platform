import { egp, sessionDetail, sessionWhen } from './format';
import { SESSIONS } from '../testing/fixtures';

test('teacher money is EGP with the isolated amount', () => {
  expect(egp(145)).toContain('145');
  expect(egp(145)).toContain('ج.م');
});

test('a session line: the Riyadh day and time, then length and students', () => {
  expect(sessionWhen('2026-09-03T14:00:00Z')).toBe('3 سبتمبر 2026 · 17:00');
  expect(sessionDetail(SESSIONS[0] as never)).toBe('30 دقيقة · سهيلة');
  expect(sessionDetail({ minutes: 45, students: [] })).toBe('45 دقيقة');
});
