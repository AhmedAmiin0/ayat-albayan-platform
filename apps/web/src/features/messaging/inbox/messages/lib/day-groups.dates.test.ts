import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { locale } from '@/lib/i18n/locale';
import { dayLabel } from './day-groups';

// The date-fns facade swap (docs/34 §7) keeps the separators the chat log showed before.
const now = new Date('2026-10-01T00:30:00');

describe('day separators, as before', () => {
  it('today, yesterday (across the month), else the long date', () => {
    expect(dayLabel(new Date('2026-10-01T00:00:00'), now)).toBe(t.inbox.dayToday);
    expect(dayLabel(new Date('2026-09-30T23:59:00'), now)).toBe(t.inbox.dayYesterday);
    const at = new Date('2026-09-29T23:59:00');
    const old = new Intl.DateTimeFormat(intlLocale(locale), { weekday: 'long', day: 'numeric', month: 'long' });
    expect(dayLabel(at, now)).toBe(old.format(at));
  });
});
