import { describe, expect, it } from 'vitest';
import { costFacts, currenciesOf, expenseFacts, paymentFacts } from './finance.mapper';

const student = (lesson_id: string, source: 'referral' | null) => ({ lesson_id, student: { guardian: { source } } });

describe('costFacts (teacher cost = the ledger amount of each payable lesson)', () => {
  it('costs each rated lesson in EGP in its Riyadh month, and counts the unrated ones', () => {
    const { facts, unrated } = costFacts(
      [
        { lesson_id: 'l1', starts_at: '2026-09-30T21:00:00.000Z', amount: 60 },
        { lesson_id: 'l2', starts_at: '2026-10-01T16:00:00.000Z', amount: null },
        { lesson_id: 'l3', starts_at: '2026-10-01T16:00:00.000Z', amount: 77.78 },
      ],
      [student('l1', 'referral'), student('l3', 'referral'), student('l3', null), { lesson_id: 'l3', student: null }],
    );
    expect(unrated).toBe(1);
    expect(facts).toEqual([
      { amount: 60, currency: 'EGP', month: '2026-10', sources: ['referral'] },
      { amount: 77.78, currency: 'EGP', month: '2026-10', sources: ['referral', 'unknown', 'unknown'] },
    ]);
  });

  it('a lesson without students has no source (the totals book it as unknown)', () => {
    expect(costFacts([{ lesson_id: 'l1', starts_at: '2026-10-01T16:00:00.000Z', amount: 50 }]).facts[0]?.sources).toEqual([]);
  });
});

describe('paymentFacts / expenseFacts / currenciesOf', () => {
  it('a payment takes its Riyadh month and its guardian source (none → unknown)', () => {
    const facts = paymentFacts([
      { amount: 145, currency: 'SAR', paid_at: '2026-09-30T22:00:00.000Z', subscription: { fx_rate: null, student: { guardian: { source: 'facebook_ad' } } } },
      { amount: 50, currency: 'USD', paid_at: '2026-10-02T09:00:00.000Z', subscription: null },
    ]);
    expect(facts).toEqual([
      { amount: 145, currency: 'SAR', month: '2026-10', source: 'facebook_ad' },
      { amount: 50, currency: 'USD', month: '2026-10', source: 'unknown' },
    ]);
    expect([...currenciesOf(facts, [{ currency: 'EGP' }])].sort()).toEqual(['EGP', 'SAR', 'USD']);
  });

  it('a USD package payment is booked in SAR at its quote rate (stable after the month closes)', () => {
    const [fact] = paymentFacts([
      { amount: 40, currency: 'USD', paid_at: '2026-10-02T09:00:00.000Z', subscription: { fx_rate: 0.25, student: null } },
    ]);
    expect(fact).toEqual({ amount: 160, currency: 'SAR', month: '2026-10', source: 'unknown' });
  });

  it('an expense month "2026-09-01" becomes "2026-09"', () => {
    expect(expenseFacts([{ month: '2026-09-01', category: 'ads', amount: 17000, currency: 'EGP' }])).toEqual([
      { amount: 17000, currency: 'EGP', month: '2026-09', category: 'ads' },
    ]);
  });
});
