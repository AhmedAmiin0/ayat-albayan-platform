import { describe, expect, it } from 'vitest';
import { pickSales, type SalesCandidate } from './pick-sales.js';

const c = (id: string, openLeads: number, lastAssignedAt: string | null = null): SalesCandidate => ({ id, openLeads, lastAssignedAt });

describe('pickSales (auto-assignment of a new lead)', () => {
  it('no salespeople: null, the lead stays unassigned', () => {
    expect(pickSales([])).toBeNull();
  });

  it('the least loaded one wins', () => {
    expect(pickSales([c('a', 5), c('b', 2), c('c', 9)])).toBe('b');
  });

  it('a tie goes to whoever was assigned longest ago; never assigned comes first', () => {
    expect(pickSales([c('a', 3, '2026-10-03T10:00:00Z'), c('b', 3, '2026-10-01T10:00:00Z')])).toBe('b');
    expect(pickSales([c('a', 3, '2026-10-01T10:00:00Z'), c('b', 3, null)])).toBe('b');
  });

  it('a full tie is stable: the lowest id', () => {
    expect(pickSales([c('b', 1), c('a', 1)])).toBe('a');
    expect(pickSales([c('a', 1), c('b', 1)])).toBe('a');
  });

  it('hands leads out in turn: simulating 6 leads over 3 people gives each 2', () => {
    const people = [c('a', 0), c('b', 0), c('c', 0)];
    const got: Record<string, number> = { a: 0, b: 0, c: 0 };
    for (let i = 0; i < 6; i++) {
      const id = pickSales(people) ?? '';
      got[id] = (got[id] ?? 0) + 1;
      const who = people.find((p) => p.id === id);
      if (who) {
        who.openLeads += 1;
        who.lastAssignedAt = new Date(Date.UTC(2026, 9, 3, 10, i)).toISOString();
      }
    }
    expect(got).toEqual({ a: 2, b: 2, c: 2 });
  });

  it('does not change its input', () => {
    const input = [c('b', 2), c('a', 1)];
    pickSales(input);
    expect(input.map((x) => x.id)).toEqual(['b', 'a']);
  });
});
