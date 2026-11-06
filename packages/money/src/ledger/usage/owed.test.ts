import { describe, expect, it } from 'vitest';
import { dueOf, owedFor, owesMore, partPaidOf } from './owed.js';

// Owner 2026-11-06: a stopped course owes what the stop stored, every other package its price.
const live = { price: 400, cancel_kind: null };
const stopped = (owed: number | string | null) => ({ price: 400, cancel_kind: 'stopped', stop_owed_amount: owed });

describe('owedFor', () => {
  it('a running package owes its price, whatever a stray stop_owed_amount says', () => {
    expect(owedFor(live)).toBe(400);
    expect(owedFor({ ...live, stop_owed_amount: 10 })).toBe(400);
    expect(owedFor({ price: 400, cancel_kind: 'unused', stop_owed_amount: 0 })).toBe(400);
  });

  it('a stopped package owes the stored decision (numeric strings from PostgREST too)', () => {
    expect(owedFor(stopped(150))).toBe(150);
    expect(owedFor(stopped('99.50'))).toBe(99.5);
    expect(owedFor(stopped(0))).toBe(0);
  });

  it('a stopped package with nothing stored (never after the backfill) owes its price', () => {
    expect(owedFor(stopped(null))).toBe(400);
    expect(owedFor({ price: 400, cancel_kind: 'stopped' })).toBe(400);
  });
});

describe('dueOf', () => {
  it('owed − net paid, never below 0, cents-exact', () => {
    expect(dueOf(live, 100)).toBe(300);
    expect(dueOf(stopped(150), 100)).toBe(50);
    expect(dueOf(stopped(150), 200)).toBe(0);
    expect(dueOf(stopped(0.3), 0.1)).toBe(0.2);
  });

  it('after a refund stop (owed = net paid after it) nothing is due', () => {
    expect(dueOf(stopped(120), 120)).toBe(0);
    expect(owesMore({ ...stopped(120), paid: 120 })).toBe(false);
    expect(owesMore({ ...live, paid: 120 })).toBe(true);
  });
});

describe('partPaidOf', () => {
  it('says what is left against the stopped course’s owed amount, not its price', () => {
    expect(partPaidOf({ ...stopped(150), paid: 100 })).toEqual({ paid: 100, price: 150, due: 50 });
    expect(partPaidOf({ ...stopped(100), paid: 100 })).toBeNull();
    expect(partPaidOf({ ...live, paid: 100 })).toEqual({ paid: 100, price: 400, due: 300 });
  });
});
