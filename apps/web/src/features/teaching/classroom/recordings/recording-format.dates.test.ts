import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { recordingTime } from './recording-format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl string shown before.
describe('recording start, as before', () => {
  it('day + short month in the zone, «، » and the clock', () => {
    const iso = '2026-10-29T22:30:00Z';
    const day = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', timeZone: 'Africa/Cairo' });
    expect(recordingTime(iso, { cycle: '24', locale }, 'Africa/Cairo')).toBe(`${day.format(new Date(iso))}، 00:30`);
  });
});
