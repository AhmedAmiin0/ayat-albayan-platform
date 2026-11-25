import { describe, expect, it } from 'vitest';
import { quoteCustom } from '../..';

const run = (on: boolean, text: string) => quoteCustom({ on, text }, 'invalid');

describe('quoteCustom («مبلغ مخصص» on the chat quote)', () => {
  it('off: no total, valid, no error, whatever was typed', () => {
    expect(run(false, 'abc')).toEqual({ total: undefined, valid: true, error: null });
  });

  it('on: the typed amount is the total', () => {
    expect(run(true, '170')).toEqual({ total: 170, valid: true, error: null });
  });

  it('any positive amount, even under the deepest pill’s price (owner 2026-11-18)', () => {
    expect(run(true, '150')).toEqual({ total: 150, valid: true, error: null });
    expect(run(true, '1').total).toBe(1);
    expect(run(true, '١٥٣٫٥').total).toBe(153.5);
  });

  it('not an amount is invalid', () => {
    expect(run(true, '')).toEqual({ total: undefined, valid: false, error: 'invalid' });
  });
});
