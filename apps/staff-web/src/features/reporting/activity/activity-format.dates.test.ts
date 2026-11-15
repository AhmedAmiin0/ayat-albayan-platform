import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { formatAt } from './activity-format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl string shown before.
describe('activity stamp, as before', () => {
  it('the medium date in the viewer zone, «، » and the clock with seconds', () => {
    const iso = '2026-10-29T21:30:07Z';
    const day = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium', timeZone: 'Asia/Dubai' });
    expect(formatAt(iso, { cycle: '24', locale, tz: 'Asia/Dubai' })).toBe(`${day.format(new Date(iso))}، 01:30:07`);
  });
});
