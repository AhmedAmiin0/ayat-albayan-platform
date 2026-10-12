import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { notificationStamp, notificationTime } from './format';

const NOW = new Date('2026-10-12T15:00:00');
const L = intlLocale('ar');
const rel = new Intl.RelativeTimeFormat(L, { numeric: 'auto' });
const clock = new Intl.DateTimeFormat(L, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

describe('notificationTime', () => {
  it('reads the last hour relatively, «now» for under a minute (and for a clock skewed ahead)', () => {
    expect(notificationTime(new Date('2026-10-12T14:55:00').toISOString(), NOW)).toBe(rel.format(-5, 'minute'));
    expect(notificationTime(new Date('2026-10-12T14:59:40').toISOString(), NOW)).toBe(rel.format(0, 'minute'));
    expect(notificationTime(new Date('2026-10-12T15:00:30').toISOString(), NOW)).toBe(rel.format(0, 'minute'));
  });

  it('reads earlier today as the clock, older days with the date', () => {
    const morning = new Date('2026-10-12T09:05:00');
    expect(notificationTime(morning.toISOString(), NOW)).toBe(clock.format(morning));
    const older = new Date('2026-10-01T09:05:00');
    const text = notificationTime(older.toISOString(), NOW);
    expect(text).toContain(clock.format(older));
    expect(text).not.toBe(clock.format(older));
  });

  it('uses Western digits', () => {
    expect(notificationStamp('2026-10-01T09:05:00Z')).toMatch(/2026/);
  });
});
