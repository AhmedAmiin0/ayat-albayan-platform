import { describe, expect, it } from 'vitest';
import { checkAmount } from './pay-amount';
import { SESSIONS, earning } from './fixtures';
import { dueOf, openIds, toggleAll, toggleOne } from './selection';

describe('session selection', () => {
  it('only sessions with something outstanding can be ticked', () => {
    expect(openIds(SESSIONS)).toEqual(['e-4', 'e-3', 'e-1']);
  });

  it('select-all takes the open ones (never the paid one) and a second click clears', () => {
    const all = toggleAll(SESSIONS, new Set());
    expect([...all].sort()).toEqual(['e-1', 'e-3', 'e-4']);
    expect(toggleAll(SESSIONS, all).size).toBe(0);
    expect(toggleAll(SESSIONS, new Set(['e-1'])).size).toBe(3);
  });

  it('toggles one id without mutating the old set', () => {
    const one = new Set(['e-1']);
    expect([...toggleOne(one, 'e-3')].sort()).toEqual(['e-1', 'e-3']);
    expect(toggleOne(one, 'e-1').size).toBe(0);
    expect(one.size).toBe(1);
  });

  it('due is the ticked outstanding, or every open session when none is ticked', () => {
    expect(dueOf(SESSIONS, new Set(['e-3', 'e-1']))).toBe(110);
    expect(dueOf(SESSIONS, new Set())).toBe(180);
    expect(dueOf(SESSIONS, new Set(['e-2']))).toBe(0);
  });

  it('sums in piasters without float drift', () => {
    const odd = [earning({ id: 'a', outstanding: 0.1 }), earning({ id: 'b', outstanding: 0.2 })];
    expect(dueOf(odd, new Set())).toBe(0.3);
  });
});

describe('checkAmount', () => {
  it('accepts a partial amount, the full due and Arabic digits', () => {
    expect(checkAmount('50', 110)).toEqual({ amount: 50 });
    expect(checkAmount('110', 110)).toEqual({ amount: 110 });
    expect(checkAmount('١٠٠', 110)).toEqual({ amount: 100 });
  });

  it('rejects empty, zero, negative, 3 decimals and anything above the due', () => {
    expect(checkAmount('  ', 110)).toEqual({ problem: 'required' });
    for (const bad of ['0', '-5', '12.345', 'abc']) expect(checkAmount(bad, 110)).toEqual({ problem: 'invalid' });
    expect(checkAmount('110.01', 110)).toEqual({ problem: 'over' });
  });
});
