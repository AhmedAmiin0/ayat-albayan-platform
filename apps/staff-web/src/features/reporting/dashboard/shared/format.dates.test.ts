import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { monthLabel, rateDate, whenViewer } from './format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl strings shown before.
const L = intlLocale(locale);
const iso = '2026-10-29T21:30:00Z';

describe('dashboard dates, as before', () => {
  it('monthLabel', () => {
    const old = new Intl.DateTimeFormat(L, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    expect(monthLabel('2026-09')).toBe(old.format(new Date('2026-09-01T00:00:00Z')));
  });

  it('whenViewer and rateDate read in the viewer zone', () => {
    const opts = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Africa/Cairo' } as const;
    const day = new Intl.DateTimeFormat(L, opts).format(new Date(iso));
    expect(whenViewer(iso, { cycle: '24', locale, tz: 'Africa/Cairo' })).toBe(`${day} 23:30`);
    const rate = new Intl.DateTimeFormat(L, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Cairo' });
    expect(rateDate(iso, 'Africa/Cairo')).toBe(rate.format(new Date(iso)));
  });
});
