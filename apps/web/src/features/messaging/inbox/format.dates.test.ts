import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { fullTime, listTime, stampText, timesInText } from './format';
import { t } from '@/lib/i18n/i18n';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl strings the inbox showed before.
const L = intlLocale(locale);
const C24 = { cycle: '24', locale } as const;
const at = new Date('2026-09-28T17:30:00');
const now = new Date('2026-10-01T15:00:00');

describe('inbox dates, as before', () => {
  it('another day: «28 سبتمبر»-style short date, then the clock in a bubble', () => {
    const dayMonth = new Intl.DateTimeFormat(L, { day: 'numeric', month: 'short' }).format(at);
    expect(listTime(at.toISOString(), C24, now)).toBe(dayMonth);
    expect(stampText(at.toISOString(), C24, now)).toBe(`${dayMonth} 17:30`);
  });

  it('the same local day shows the clock only', () => {
    expect(stampText(new Date('2026-10-01T00:10:00').toISOString(), C24, now)).toBe('00:10');
  });

  it('the full stamp and the zone line', () => {
    const day = new Intl.DateTimeFormat(L, { dateStyle: 'medium' }).format(at);
    expect(fullTime(at.toISOString(), C24)).toBe(`${day}، 17:30`);
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(timesInText()).toBe(t.inbox.timesIn.replace('{city}', (t.tz as Record<string, string | undefined>)[zone] ?? zone));
  });
});
