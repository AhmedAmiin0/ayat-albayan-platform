import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { notificationStamp, notificationTime } from './format';

// The date-fns facade swap (docs/34 §7) keeps the exact Intl strings the bell showed before.
const L = intlLocale(locale);
const C24 = { cycle: '24', locale } as const;

describe('bell dates, as before', () => {
  it('an older row: day + short month, then the clock', () => {
    const at = new Date('2026-10-01T09:05:00');
    const dayMonth = new Intl.DateTimeFormat(L, { day: 'numeric', month: 'short' }).format(at);
    expect(notificationTime(at.toISOString(), C24, new Date('2026-10-12T12:00:00'))).toBe(`${dayMonth} 09:05`);
  });

  it('the tooltip: the medium date, «، » and the clock', () => {
    const at = new Date('2026-10-01T09:05:00');
    const day = new Intl.DateTimeFormat(L, { dateStyle: 'medium' }).format(at);
    expect(notificationStamp(at.toISOString(), C24)).toBe(`${day}، 09:05`);
  });
});
