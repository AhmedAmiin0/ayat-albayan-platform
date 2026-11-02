import { describe, expect, it } from 'vitest';
import ar from '../../../i18n/ar.json' with { type: 'json' };
import en from '../../../i18n/en.json' with { type: 'json' };
import { presenceWhen, type PresenceWhenInput } from './presence-when.js';

const NOW = new Date('2026-10-30T12:00:00Z');
const TZ = 'Asia/Riyadh';
const base: Omit<PresenceWhenInput, 'iso'> = {
  now: NOW,
  tz: TZ,
  cycle: '24',
  locale: 'ar',
  words: ar.presence,
};
const ago = (ms: number): string => new Date(NOW.getTime() - ms).toISOString();
const strip = (s: string): string => s.replace(/[⁦-⁩]/g, '');

describe('presenceWhen', () => {
  it('reads «الآن» under a minute, and for a time in the future (clock skew)', () => {
    expect(presenceWhen({ ...base, iso: ago(59_000) })).toBe('الآن');
    expect(presenceWhen({ ...base, iso: ago(-30_000) })).toBe('الآن');
  });

  it('counts minutes in the Arabic forms', () => {
    expect(presenceWhen({ ...base, iso: ago(60_000) })).toBe('منذ دقيقة');
    expect(presenceWhen({ ...base, iso: ago(2 * 60_000) })).toBe('منذ دقيقتين');
    expect(presenceWhen({ ...base, iso: ago(5 * 60_000) })).toBe('منذ 5 دقائق');
    expect(presenceWhen({ ...base, iso: ago(59 * 60_000) })).toBe('منذ 59 دقيقة');
  });

  it('shows the clock for earlier today, 24 h and 12 h', () => {
    const iso = '2026-10-30T07:30:00Z'; // 10:30 in Riyadh
    expect(strip(presenceWhen({ ...base, iso }))).toBe('اليوم 10:30');
    expect(strip(presenceWhen({ ...base, iso, cycle: '12' }))).toBe('اليوم 10:30 ص');
    expect(
      strip(
        presenceWhen({
          ...base,
          iso: '2026-10-30T07:30:00Z',
          locale: 'en',
          words: en.presence,
          cycle: '12',
        }),
      ),
    ).toBe('today at 10:30 AM');
  });

  it("reads «أمس» for the day before, in the viewer's zone", () => {
    expect(presenceWhen({ ...base, iso: '2026-10-29T08:00:00Z' })).toBe('أمس');
    // 22:30 UTC on the 29th is already the 30th in Riyadh: today.
    expect(strip(presenceWhen({ ...base, iso: '2026-10-29T22:30:00Z' }))).toBe('اليوم 01:30');
  });

  it('writes a date further back, the year only when it is not this year', () => {
    expect(presenceWhen({ ...base, iso: '2026-10-25T08:00:00Z' })).toBe('25 أكتوبر');
    expect(presenceWhen({ ...base, iso: '2025-10-25T08:00:00Z' })).toBe('25 أكتوبر 2025');
    expect(
      presenceWhen({ ...base, iso: '2026-10-25T08:00:00Z', locale: 'en', words: en.presence }),
    ).toBe('25 October');
  });

  it('reads an invalid time as «الآن» rather than failing', () => {
    expect(presenceWhen({ ...base, iso: 'not a date' })).toBe('الآن');
  });
});
