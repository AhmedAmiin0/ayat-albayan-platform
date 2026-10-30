import { describe, expect, it } from 'vitest';
import {
  ACADEMY_TZ,
  deviceTimeZone,
  otherZoneClock,
  resolveViewerTz,
  sameClockAt,
} from './viewer-zone.js';

const CAIRO = 'Africa/Cairo';
const RIYADH = 'Asia/Riyadh';
const opts = (tz: string) => ({ tz, cycle: '24', locale: 'ar' }) as const;

describe('resolveViewerTz (docs/34 §2: person → device → academy)', () => {
  it('prefers the person’s own zone', () => {
    expect(resolveViewerTz({ person: CAIRO, device: 'Asia/Dubai' })).toBe(CAIRO);
  });

  it('falls back to the device zone', () => {
    expect(resolveViewerTz({ person: null, device: CAIRO })).toBe(CAIRO);
    expect(resolveViewerTz({ person: 'Mars/Base', device: CAIRO })).toBe(CAIRO);
  });

  it('ends at the academy zone', () => {
    expect(resolveViewerTz({})).toBe(ACADEMY_TZ);
    expect(resolveViewerTz({ person: '', device: 'Nope/Zone' })).toBe(RIYADH);
  });
});

describe('zone checks', () => {
  it('reads a device zone the engine can format in', () => {
    const tz = deviceTimeZone() ?? CAIRO;
    expect(() => new Intl.DateTimeFormat('en', { timeZone: tz })).not.toThrow();
  });
});

describe('otherZoneClock across the Cairo DST change (no fixed offsets)', () => {
  // A Riyadh family's 18:00 lesson = 15:00 UTC.
  const winter = new Date('2026-11-05T15:00:00Z'); // Cairo UTC+2 after 2026-10-30
  const summer = new Date('2026-10-22T15:00:00Z'); // Cairo UTC+3 (summer time)

  it('a Cairo viewer sees 17:00 and the family’s 18:00 in winter', () => {
    expect(otherZoneClock(winter, RIYADH, opts(CAIRO))).toBe('18:00');
  });

  it('no label in summer, when Cairo reads Riyadh’s clock', () => {
    expect(sameClockAt(summer, { a: CAIRO, b: RIYADH })).toBe(true);
    expect(otherZoneClock(summer, RIYADH, opts(CAIRO))).toBeNull();
  });

  it('switches on the night of the change', () => {
    expect(sameClockAt(new Date('2026-10-29T20:00:00Z'), { a: CAIRO, b: RIYADH })).toBe(true);
    expect(sameClockAt(new Date('2026-10-30T00:00:00Z'), { a: CAIRO, b: RIYADH })).toBe(false);
  });

  it('a Riyadh viewer sees no label for a Riyadh family; unknown zones give none', () => {
    expect(otherZoneClock(winter, RIYADH, opts(RIYADH))).toBeNull();
    expect(otherZoneClock(winter, null, opts(CAIRO))).toBeNull();
    expect(otherZoneClock(winter, 'Mars/Base', opts(CAIRO))).toBeNull();
  });
});
