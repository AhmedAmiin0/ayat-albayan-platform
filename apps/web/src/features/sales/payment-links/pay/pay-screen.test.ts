import { describe, expect, it } from 'vitest';
import { parsePayReturn, payScreen } from './pay-screen';

describe('«الدفع» public page screens', () => {
  it('an open link: pay, thanks after ?done=1, back after ?cancelled=1', () => {
    expect(payScreen('open', {})).toBe('open');
    expect(payScreen('open', { done: true })).toBe('thanks');
    expect(payScreen('open', { cancelled: true })).toBe('back');
  });

  it('paid thanks right after the payment, else says paid; the others stay', () => {
    expect(payScreen('paid', { done: true })).toBe('thanks');
    expect(payScreen('paid', {})).toBe('paid');
    for (const s of ['expired', 'cancelled', 'processing'] as const) expect(payScreen(s, { done: true })).toBe(s);
  });

  it('the search keeps done=1 / cancelled=1 only', () => {
    expect(parsePayReturn({ done: 1 })).toEqual({ done: true });
    expect(parsePayReturn({ cancelled: '1', other: 'x' })).toEqual({ cancelled: true });
    expect(parsePayReturn({ done: 'yes' })).toEqual({});
  });
});
