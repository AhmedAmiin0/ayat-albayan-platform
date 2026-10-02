import { describe, expect, it } from 'vitest';
import { DEFAULT_LOCALE, intlLocale, localeDir, parseLocale } from './locale.js';

describe('locale', () => {
  it('defaults to Arabic for nothing saved or an unknown value', () => {
    expect(DEFAULT_LOCALE).toBe('ar');
    for (const v of [null, undefined, '', 'fr', 'EN', 1]) expect(parseLocale(v)).toBe('ar');
    expect(parseLocale('ar')).toBe('ar');
    expect(parseLocale('en')).toBe('en');
  });

  it('pairs each language with its direction', () => {
    expect(localeDir('ar')).toBe('rtl');
    expect(localeDir('en')).toBe('ltr');
  });

  it('keeps Western digits in both Intl locales (rule 10)', () => {
    const at = new Date('2026-10-04T14:05:00Z');
    const fmt = (l: 'ar' | 'en') =>
      new Intl.DateTimeFormat(intlLocale(l), { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }).format(at);
    expect(fmt('ar')).toMatch(/14|02/);
    expect(fmt('en')).toBe('14:05');
    expect(new Intl.NumberFormat(intlLocale('ar')).format(1234)).not.toMatch(/[٠-٩]/);
  });
});
