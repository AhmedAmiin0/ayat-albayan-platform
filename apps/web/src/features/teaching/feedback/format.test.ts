import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { feedbackDate } from './format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl string shown before.
describe('feedbackDate', () => {
  it('day, short month and the whole year in the browser zone, Western digits', () => {
    const iso = '2026-10-03T09:00:00Z';
    const old = new Intl.DateTimeFormat(intlLocale(locale), { day: 'numeric', month: 'short', year: 'numeric' });
    expect(feedbackDate(iso)).toBe(old.format(new Date(iso)));
    expect(feedbackDate(iso)).toContain('2026');
    expect(feedbackDate(iso)).not.toMatch(/[٠-٩]/);
  });
});
