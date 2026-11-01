import { describe, expect, it, vi } from 'vitest';
import ar from '../../i18n/ar.json' with { type: 'json' };
import en from '../../i18n/en.json' with { type: 'json' };
import { riyadhToday, zonedWhenText } from '@ab/time';

describe('riyadhToday (docs/11 §3)', () => {
  it('is the Riyadh day: 21:00 UTC is already tomorrow there', () => {
    expect(riyadhToday(new Date('2026-10-01T20:59:00Z'))).toBe('2026-10-01');
    expect(riyadhToday(new Date('2026-10-01T21:00:00Z'))).toBe('2026-10-02');
    expect(riyadhToday(new Date('2026-12-31T21:30:00Z'))).toBe('2027-01-01');
  });

  it('defaults to now', () => {
    vi.useFakeTimers({ now: new Date('2026-10-05T09:00:00Z') });
    try {
      expect(riyadhToday()).toBe('2026-10-05');
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('zonedWhenText', () => {
  const arWords = { weekday: ar.enums.weekday, locale: 'ar' as const, tz: 'Asia/Riyadh' };

  it('weekday, day, month and the Riyadh clock (UTC+3), Western digits', () => {
    expect(zonedWhenText('2026-10-12T15:00:00.000Z', arWords)).toBe('الاثنين 12 أكتوبر 18:00');
    expect(zonedWhenText('2026-10-12T22:30:00.000Z', arWords)).toBe('الثلاثاء 13 أكتوبر 01:30');
  });

  it('reads in the viewer’s zone (docs/34): Cairo after its summer time', () => {
    const cairo = { ...arWords, tz: 'Africa/Cairo' };
    expect(zonedWhenText('2026-11-02T15:00:00.000Z', cairo)).toBe('الاثنين 2 نوفمبر 17:00');
    expect(zonedWhenText('2026-10-26T15:00:00.000Z', cairo)).toBe('الاثنين 26 أكتوبر 18:00');
    expect(zonedWhenText('2026-11-02T21:30:00.000Z', cairo)).toBe('الاثنين 2 نوفمبر 23:30');
  });

  it('reads the injected words: English month and weekday', () => {
    const text = zonedWhenText('2026-10-12T15:00:00.000Z', { weekday: en.enums.weekday, locale: 'en', tz: 'Asia/Riyadh' });
    expect(text.startsWith(`${en.enums.weekday['1']} `)).toBe(true);
    expect(text).toContain('October');
    expect(text.endsWith(' 18:00')).toBe(true);
  });

  it('an unknown weekday name reads as nothing before the date', () => {
    expect(zonedWhenText('2026-10-12T15:00:00.000Z', { weekday: {}, locale: 'ar', tz: 'Asia/Riyadh' })).toBe(' 12 أكتوبر 18:00');
  });
});
