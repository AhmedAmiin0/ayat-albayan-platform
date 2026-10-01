import { describe, expect, it } from 'vitest';
import { formatAge, formatDateTime, initialOf } from './format';
import { parseLeadSearch, parsePageSearch } from './types';

const rel = new Intl.RelativeTimeFormat('ar-EG-u-nu-latn', { numeric: 'auto' });
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
    expect(formatDateTime('2026-10-01T12:00:00Z')).not.toMatch(EASTERN);
  });

  it('formatDateTime shows a dash for an empty value', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('2026-10-01T12:00:00Z')).not.toBe('—');
  });

  it.each([
    ['أم سلمى', 'س'],
    ['أبو فهد', 'ف'],
    ['عبد الله الشهري', 'ع'],
    ['  نورهان سعيد', 'ن'],
    ['أمل', 'أ'],
    [null, ''],
  ])('initialOf(%s) = %s', (name, expected) => {
    expect(initialOf(name)).toBe(expected);
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
