import { describe, expect, it } from 'vitest';
import { amountProblem, earningIdsOf, payCeiling } from './earnings-pay.js';

const SESSIONS = [
  { id: 'e3', outstanding: 50 },
  { id: 'e2', outstanding: 60 },
  { id: 'e1', outstanding: 0 },
];
const pick = (...ids: string[]) => new Map(SESSIONS.filter((s) => ids.includes(s.id)).map((s) => [s.id, s]));

describe('payCeiling', () => {
  it('no ticks → the whole balance; ticks → what those sessions still owe', () => {
    expect(payCeiling(new Map(), 110)).toBe(110);
    expect(payCeiling(pick('e3', 'e2'), 110)).toBe(110);
    expect(payCeiling(pick('e2'), 110)).toBe(60);
  });
});

describe('amountProblem', () => {
  it('empty / not a number / not positive / over the ceiling / fine', () => {
    expect(amountProblem({ amount: null, text: ' ', ceiling: 60 })).toBe('required');
    expect(amountProblem({ amount: null, text: 'abc', ceiling: 60 })).toBe('invalid');
    expect(amountProblem({ amount: 0, text: '0', ceiling: 60 })).toBe('invalid');
    expect(amountProblem({ amount: -1, text: '-1', ceiling: 60 })).toBe('invalid');
    expect(amountProblem({ amount: 60.01, text: '60.01', ceiling: 60 })).toBe('overpayment');
    expect(amountProblem({ amount: 60, text: '60', ceiling: 60 })).toBeNull();
    expect(amountProblem({ amount: 20.5, text: '20.5', ceiling: 60 })).toBeNull();
  });

  it('compares in piasters (0.1 + 0.2 owed, 0.3 paid)', () => {
    expect(amountProblem({ amount: 0.3, text: '0.3', ceiling: 0.1 + 0.2 })).toBeNull();
  });
});

describe('earningIdsOf', () => {
  it('ticked ids, or undefined so the API pays oldest first', () => {
    expect(earningIdsOf(pick('e3', 'e2'))).toEqual(['e3', 'e2']);
    expect(earningIdsOf(new Map())).toBeUndefined();
  });
});
