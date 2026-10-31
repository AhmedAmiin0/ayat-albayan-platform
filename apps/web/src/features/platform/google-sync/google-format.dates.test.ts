import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { formatAt } from './google-format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl string shown before.
describe('Google sync stamp, as before', () => {
  it('the medium date in the viewer zone, «، » and the clock', () => {
    const iso = '2026-10-29T21:30:00Z';
    const day = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: 'Africa/Cairo' });
    expect(formatAt(iso, { cycle: '24', locale, tz: 'Africa/Cairo' })).toBe(`${day.format(new Date(iso))}، 23:30`);
  });
});
