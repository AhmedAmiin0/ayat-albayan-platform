import { describe, expect, it } from 'vitest';
import { costFacts, currenciesOf, expenseFacts, frozenRates, lessonCostEgp, paymentFacts, type CostLessonIn } from './finance.mapper';

const RATES = { rate_30: 60, rate_45: 90, rate_60: null, rate_90: 150 };
const student = (source: 'referral' | null) => ({ student: { guardian: { source } } });
const lesson = (over: Partial<CostLessonIn> = {}): CostLessonIn => ({
  id: 'l1',
  starts_at: '2026-10-01T16:00:00.000Z',
  ends_at: '2026-10-01T16:30:00.000Z',
  teacher: RATES,
  lesson_students: [student('referral')],
  ...over,
});

describe('lessonCostEgp (teacher cost = rate for the duration)', () => {
  it('30 / 45 / 90 minutes take that rate', () => {
    expect(lessonCostEgp(lesson())).toBe(60);
    expect(lessonCostEgp(lesson({ ends_at: '2026-10-01T16:45:00.000Z' }))).toBe(90);
    expect(lessonCostEgp(lesson({ ends_at: '2026-10-01T17:30:00.000Z' }))).toBe(150);
  });

  it('no rate for the duration, an odd length or no teacher → null (never guessed)', () => {
    expect(lessonCostEgp(lesson({ ends_at: '2026-10-01T17:00:00.000Z' }))).toBeNull();
    expect(lessonCostEgp(lesson({ ends_at: '2026-10-01T16:40:00.000Z' }))).toBeNull();
    expect(lessonCostEgp(lesson({ teacher: null }))).toBeNull();
  });
});

describe('frozen payout rates (a closed month keeps what the teacher was paid)', () => {
  const frozen = frozenRates([
    { breakdown: { lines: [{ duration: 30, lessons: 1, rate: 50, amount: 50 }], lesson_ids: ['l1'], statuses: ['completed'] } },
    { breakdown: 'hand edited' },
  ]);
  it('a lesson counted by an approved payout costs its frozen rate, even after the teacher rate changed', () => {
    expect(lessonCostEgp(lesson(), frozen)).toBe(50);
    expect(lessonCostEgp(lesson({ teacher: null }), frozen)).toBe(50);
  });
  it('any other lesson costs the current rate', () => {
    expect(lessonCostEgp(lesson({ id: 'l2' }), frozen)).toBe(60);
    expect(costFacts([lesson(), lesson({ id: 'l2' })], frozen).facts.map((f) => f.amount)).toEqual([50, 60]);
  });
});

describe('costFacts', () => {
  it('costs each rated lesson in EGP in its Riyadh month, and counts the unrated ones', () => {
    const { facts, unrated } = costFacts([
      lesson({ starts_at: '2026-09-30T21:00:00.000Z', ends_at: '2026-09-30T21:30:00.000Z' }),
      lesson({ ends_at: '2026-10-01T17:00:00.000Z' }),
      lesson({ lesson_students: [student('referral'), student(null), { student: null }] }),
    ]);
    expect(unrated).toBe(1);
    expect(facts).toEqual([
      { amount: 60, currency: 'EGP', month: '2026-10', sources: ['referral'] },
      { amount: 60, currency: 'EGP', month: '2026-10', sources: ['referral', 'unknown', 'unknown'] },
    ]);
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
