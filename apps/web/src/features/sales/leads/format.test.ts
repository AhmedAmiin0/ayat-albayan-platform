import { intlLocale } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { locale } from '@/lib/i18n/locale';
import { formatAge, formatDate, formatDateTime } from './format';
import { parseLeadSearch, parsePageSearch } from './types';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

const rel = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
const NOW = new Date('2026-10-01T12:00:00Z');
const EASTERN = /[٠-٩]/;

describe('lead inbox formatting (R-LEAD-02 list columns)', () => {
  it.each([
    ['2026-10-01T11:55:00Z', rel.format(-5, 'minute')],
    ['2026-10-01T09:00:00Z', rel.format(-3, 'hour')],
    ['2026-09-28T12:00:00Z', rel.format(-3, 'day')],
  ])('formatAge(%s) picks the right unit', (iso, expected) => {
    expect(formatAge(iso, NOW)).toBe(expected);
  });

  it('prints Western digits (docs/07 one numeral system)', () => {
    expect(formatAge('2026-09-28T12:00:00Z', NOW)).toContain('3');
    expect(formatAge('2026-09-28T12:00:00Z', NOW)).not.toMatch(EASTERN);
    expect(formatDateTime('2026-10-01T12:00:00Z', C24)).not.toMatch(EASTERN);
  });

  it('formatDateTime shows a dash for an empty value', () => {
    expect(formatDateTime(null, C24)).toBe('—');
    expect(formatDateTime('2026-10-01T12:00:00Z', C24)).not.toBe('—');
  });

  it('formatDateTime is 24h (no «م/ص»); formatDate drops the time', () => {
    const evening = new Date(2026, 9, 1, 23, 15).toISOString();
    expect(formatDateTime(evening, C24)).toContain('23:15');
    expect(formatDateTime(evening, C24)).not.toMatch(/[صم]$/);
    expect(formatDate(evening)).not.toContain(':');
    expect(formatDate(evening)).toContain('2026');
    expect(formatDate(null)).toBe('—');
  });
});

describe('inbox search params', () => {
  it('keeps a known status, source, search and a valid page', () => {
    expect(parseLeadSearch({ status: 'no_reply', source: 'referral', q: ' سلمى ', page: '3' })).toEqual({
      status: 'no_reply',
      source: 'referral',
      q: 'سلمى',
      page: 3,
    });
  });

  it('drops an unknown status/source, a blank search and falls back to page 1', () => {
    expect(parseLeadSearch({ status: 'توظيف', source: 'tiktok', q: '  ', page: '-2' })).toEqual({ page: 1 });
    expect(parsePageSearch({ page: 'abc' })).toEqual({ page: 1 });
  });
});
