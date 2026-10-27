import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { notificationStamp, notificationTime } from './format';

const NOW = new Date('2026-10-12T15:00:00');
const L = intlLocale('ar');
const rel = new Intl.RelativeTimeFormat(L, { numeric: 'auto' });
const H24 = { cycle: '24', locale: 'ar' } as const;
const H12 = { cycle: '12', locale: 'ar' } as const;

describe('notificationTime', () => {
  it('reads the last hour relatively, «now» for under a minute (and for a clock skewed ahead)', () => {
    expect(notificationTime(new Date('2026-10-12T14:55:00').toISOString(), H24, NOW)).toBe(rel.format(-5, 'minute'));
    expect(notificationTime(new Date('2026-10-12T14:59:40').toISOString(), H24, NOW)).toBe(rel.format(0, 'minute'));
    expect(notificationTime(new Date('2026-10-12T15:00:30').toISOString(), H24, NOW)).toBe(rel.format(0, 'minute'));
  });

  it('reads earlier today as the clock, older days with the date', () => {
    const morning = new Date('2026-10-12T09:05:00');
    expect(notificationTime(morning.toISOString(), H24, NOW)).toBe('09:05');
    const text = notificationTime(new Date('2026-10-01T09:05:00').toISOString(), H24, NOW);
    expect(text).toMatch(/ 09:05$/);
    expect(text).not.toBe('09:05');
  });

  it('12 h shows ص / م', () => {
    expect(notificationTime(new Date('2026-10-12T09:05:00').toISOString(), H12, NOW)).toBe('9:05 ص');
    expect(notificationTime(new Date('2026-10-12T13:30:00').toISOString(), { cycle: '12', locale: 'en' }, NOW)).toBe('1:30 PM');
  });

  it('uses Western digits', () => {
    expect(notificationStamp('2026-10-01T09:05:00Z', H24)).toMatch(/2026، \d{2}:05$/);
    expect(notificationStamp('2026-10-01T09:05:00Z', H12)).toMatch(/2026، \d{1,2}:05 [صم]$/);
  });
});
