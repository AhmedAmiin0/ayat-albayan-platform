import { describe, expect, it } from 'vitest';
import { broughtAtOf } from '../students/brought-at';
import { generateTargets } from './generate-targets';
import { sumByCurrency } from './totals';

describe('sumByCurrency (never one number across currencies)', () => {
  it('sums each currency on its own, in exact cents', () => {
    const rows = [
      { amount: 0.1, currency: 'SAR' },
      { amount: 0.2, currency: 'SAR' },
      { amount: 700, currency: 'EGP' },
    ];
    expect(sumByCurrency(rows)).toEqual({ SAR: 0.3, EGP: 700 });
  });

  it('leaves out rows the filter rejects, and a currency with none disappears', () => {
    const rows = [
      { amount: 50, currency: 'SAR', ok: true },
      { amount: 20, currency: 'USD', ok: false },
    ];
    expect(sumByCurrency(rows, (r) => r.ok)).toEqual({ SAR: 50 });
    expect(sumByCurrency([])).toEqual({});
  });
});

describe('generateTargets', () => {
  const st = (id: string, status: 'draft' | 'approved' | 'paid') => ({ assistant: { id }, status });
  it('skips assistants whose month is already approved or paid, keeps drafts and missing ones', () => {
    expect(generateTargets(['a', 'b', 'c', 'd'], [st('a', 'draft'), st('b', 'approved'), st('c', 'paid')])).toEqual(['a', 'd']);
  });
});

describe('broughtAtOf', () => {
  it('omits an empty day; a past day is noon Riyadh in UTC; today is now', () => {
    const now = new Date('2026-10-06T10:00:00Z');
    expect(broughtAtOf('')).toEqual({});
    expect(broughtAtOf('2026-10-01', now)).toEqual({ broughtAt: '2026-10-01T09:00:00.000Z' });
    expect(broughtAtOf('2026-10-06', now)).toEqual({ broughtAt: now.toISOString() });
  });
});
