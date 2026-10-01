import { describe, expect, it } from 'vitest';
import { formatAge, formatDateTime, lastMessageAt } from './format';
import { parseLeadSearch, parsePageSearch } from './types';

const rel = new Intl.RelativeTimeFormat('ar-EG', { numeric: 'auto' });
const NOW = new Date('2026-10-01T12:00:00Z');

describe('lead inbox formatting (R-LEAD-02 list columns)', () => {
  it.each([
    ['2026-10-01T11:55:00Z', rel.format(-5, 'minute')],
    ['2026-10-01T09:00:00Z', rel.format(-3, 'hour')],
    ['2026-09-28T12:00:00Z', rel.format(-3, 'day')],
  ])('formatAge(%s) picks the right unit', (iso, expected) => {
    expect(formatAge(iso, NOW)).toBe(expected);
  });

  it('formatDateTime shows a dash for an empty thread', () => {
    expect(formatDateTime(null)).toBe('—');
    expect(formatDateTime('2026-10-01T12:00:00Z')).not.toBe('—');
  });

  it('lastMessageAt takes the later of inbound / outbound', () => {
    const inbound = '2026-10-01T10:00:00+00:00';
    const outbound = '2026-10-01T11:00:00+00:00';
    expect(lastMessageAt({ last_inbound_at: inbound, last_outbound_at: outbound })).toBe(outbound);
    expect(lastMessageAt({ last_inbound_at: inbound, last_outbound_at: null })).toBe(inbound);
    expect(lastMessageAt({ last_inbound_at: null, last_outbound_at: null })).toBeNull();
  });
});

describe('inbox search params', () => {
  it('keeps a known status and a valid page', () => {
    expect(parseLeadSearch({ status: 'no_reply', page: '3' })).toEqual({ status: 'no_reply', page: 3 });
  });

  it('drops an unknown status and falls back to page 1', () => {
    expect(parseLeadSearch({ status: 'توظيف', page: '-2' })).toEqual({ page: 1 });
    expect(parsePageSearch({ page: 'abc' })).toEqual({ page: 1 });
  });
});
