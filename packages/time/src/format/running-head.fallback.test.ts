import { afterEach, describe, expect, it, vi } from 'vitest';

const Real = Intl.DateTimeFormat;

afterEach(() => {
  Intl.DateTimeFormat = Real;
  vi.resetModules();
});

describe('formatRunningHead without the Umm al-Qura calendar (e.g. Hermes)', () => {
  // The cold re-import of the date-fns graph after resetModules takes ≈ 2.5 s on its own; under a
  // full turbo run the default 5 s ran out, so this one test waits longer.
  const title = 'imports fine and leaves the Hijri line empty; the rest still formats';
  it(title, { timeout: 20_000 }, async () => {
    class NoIslamic extends Real {
      constructor(locale?: string | string[], options?: Intl.DateTimeFormatOptions) {
        if (String(locale).includes('islamic')) throw new RangeError('Unsupported calendar');
        super(locale, options);
      }
    }
    Intl.DateTimeFormat = NoIslamic as typeof Intl.DateTimeFormat;
    vi.resetModules();
    const { formatRunningHead } = await import('./running-head.js');
    expect(formatRunningHead(new Date('2026-10-01T12:20:00Z'))).toEqual({
      gregorian: 'الخميس 1 أكتوبر 2026',
      hijri: '',
      riyadhTime: '15:20',
      cairoTime: '15:20',
    });
  });
});
