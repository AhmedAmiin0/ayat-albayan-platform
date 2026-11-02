import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { formatDate, formatDateTime } from './format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl strings these showed before.
const old = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: 'medium' });
const iso = '2026-10-29T21:30:00Z';

describe('lead dates, as before', () => {
  it('formatDate is the medium date in the browser zone', () => {
    expect(formatDate(iso)).toBe(old.format(new Date(iso)));
  });

  it('formatDateTime is that date, «، » and the clock', () => {
    expect(formatDateTime(iso, { cycle: '24', locale })).toMatch(new RegExp(`^${old.format(new Date(iso))}، \\d{2}:30$`));
  });
});
