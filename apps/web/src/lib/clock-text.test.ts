import { describe, expect, it } from 'vitest';
import { clockDir, clockWithSeconds, dateAndClock, hhmmText } from './clock-text';

const AR12 = { cycle: '12', locale: 'ar' } as const;
const EN24 = { cycle: '24', locale: 'en' } as const;
const at = new Date('2026-10-03T14:05:33Z');

describe('clock-text', () => {
  it('dateAndClock joins like Intl does, so 24 h reads as before', () => {
    const fields = { day: 'numeric', month: 'short' } as const;
    const intl = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { ...fields, hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' });
    expect(dateAndClock(at, { cycle: '24', locale: 'ar', tz: 'UTC' }, fields)).toBe(intl.format(at));
    expect(dateAndClock(at, { cycle: '12', locale: 'en', tz: 'UTC' }, fields)).toBe('3 أكتوبر, 2:05 PM');
    const medium = new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium', timeZone: 'UTC' });
    expect(dateAndClock(at, { ...AR12, tz: 'UTC' }, { dateStyle: 'medium' })).toBe(`${medium.format(at)}، 2:05 م`);
  });

  it('clockWithSeconds keeps the seconds in both cycles', () => {
    expect(clockWithSeconds(at, { ...EN24, tz: 'Asia/Riyadh' })).toBe('17:05:33');
    expect(clockWithSeconds(at, { ...AR12, tz: 'Asia/Riyadh' })).toBe('5:05:33 م');
    expect(clockWithSeconds(new Date('2026-10-03T14:05:07Z'), { ...EN24, tz: 'UTC' })).toBe('14:05:07');
  });

  it('hhmmText: stored «HH:MM» in the cycle; «24:00» stays in 24 h', () => {
    expect(hhmmText('17:30', AR12)).toBe('5:30 م');
    expect(hhmmText('24:00', EN24)).toBe('24:00');
    expect(hhmmText('24:00', AR12)).toBe('12:00 ص');
  });

  it('clockDir: RTL only for Arabic 12 h', () => {
    expect(clockDir(AR12)).toBe('rtl');
    expect(clockDir(EN24)).toBe('ltr');
    expect(clockDir({ cycle: '12', locale: 'en' })).toBe('ltr');
  });
});
