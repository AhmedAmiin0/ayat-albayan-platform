import { describe, expect, it } from 'vitest';
import { stopFormCheck } from './course-stop-form';
import type { StopMoney } from './course-stop-money';

const money = (over: Partial<StopMoney> = {}): StopMoney => ({
  ask: { owe: { choice: 'custom' } },
  summary: { refund: 0, due: 0 },
  valid: false,
  problem: 'owed_exceeds_price',
  ...over,
});
const base = { text: '', reason: '', tried: false };

describe('stopFormCheck (owner 2026-11-17)', () => {
  it('an empty custom amount and reason say nothing before the confirm, but block it', () => {
    expect(stopFormCheck({ ...base, money: money() })).toEqual({
      money: null,
      reason: false,
      blocked: true,
    });
  });

  it('after the confirm: «اكتب المبلغ» and «هذه الخانة مطلوبة»', () => {
    const check = stopFormCheck({ ...base, money: money(), tried: true });
    expect([check.money, check.reason]).toEqual(['amount_required', true]);
  });

  it('an amount out of range is said early, as soon as it is typed', () => {
    const check = stopFormCheck({ ...base, money: money(), text: '900' });
    expect(check.money).toBe('owed_exceeds_price');
    const refund = money({ ask: { refund: { choice: 'custom', amount: 9 } }, problem: 'refund_exceeds_allowed' });
    expect(stopFormCheck({ ...base, money: refund, text: '9' }).money).toBe('refund_exceeds_allowed');
  });

  it('a valid choice and a reason: nothing to say, the confirm runs', () => {
    const ok = money({ ask: { owe: { choice: 'attended' } }, valid: true, problem: null });
    expect(stopFormCheck({ ...base, money: ok, reason: 'سفر', tried: true })).toEqual({
      money: null,
      reason: false,
      blocked: false,
    });
  });
});
