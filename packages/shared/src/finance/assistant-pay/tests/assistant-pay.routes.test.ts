import { describe, expect, it } from 'vitest';
import { assistantPayRoutes } from '../assistant-pay.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ID = '00000000-0000-4000-8000-0000000000a1';

const terms = {
  assistant_id: ID,
  commission: { type: 'percent', value: 10, currency: null, starts_on: '2026-10-01' },
  salary: null,
  renewal_share_percent: 50,
};
const commission = {
  id: ID,
  assistant: { id: ID, name: 'A' },
  student: { id: ID, code: 'AB-0001', name: 'S' },
  subscription_id: null,
  kind: 'first',
  share_percent: 100,
  type: 'percent',
  rate: 10,
  base_amount: 400,
  base_currency: 'SAR',
  amount: 40,
  currency: 'SAR',
  earned_at: '2026-10-01T08:00:00.000Z',
  status: 'earned',
  void_reason: null,
  voided_at: null,
  statement_id: null,
};

describe('assistantPayRoutes', () => {
  it('keeps the paths the api serves today, static segments first', () => {
    expect(Object.values(assistantPayRoutes).map(line)).toEqual([
      'GET /assistant-pay/terms',
      'GET /assistant-pay/terms/:assistantId',
      'PUT /assistant-pay/terms/:assistantId',
      'GET /assistant-pay/brought-by/:studentId',
      'GET /assistant-pay/commissions',
      'POST /assistant-pay/commissions/:id/void',
      'POST /assistant-pay/adjustments',
      'POST /assistant-pay/brought-by',
    ]);
  });

  it('answers terms, a terms list, the ledger and who brought a student as the api builds them', () => {
    expect(assistantPayRoutes.get.response.parse(terms)).toEqual(terms);
    const row = { ...terms, name: 'A' };
    expect(assistantPayRoutes.list.response.parse([row])).toEqual([row]);
    expect(assistantPayRoutes.ledger.response.parse([commission])).toEqual([commission]);
    const nobody = { assistant: null, brought_at: null };
    expect(assistantPayRoutes.broughtByOf.response.parse(nobody)).toEqual(nobody);
    expect(assistantPayRoutes.broughtBy.response.parse({ changed: 2 })).toEqual({ changed: 2 });
  });

  it('refuses a commission of an unknown kind, type or status', () => {
    const r = assistantPayRoutes.ledger.response;
    expect(r.safeParse([{ ...commission, kind: 'bonus' }]).success).toBe(false);
    expect(r.safeParse([{ ...commission, type: 'flat' }]).success).toBe(false);
    expect(r.safeParse([{ ...commission, status: 'paid' }]).success).toBe(false);
  });

  it('refuses an assistant, student or commission id that is not a uuid', () => {
    expect(assistantPayRoutes.get.params.safeParse({ assistantId: 'a1' }).success).toBe(false);
    expect(assistantPayRoutes.broughtByOf.params.safeParse({ studentId: 's' }).success).toBe(false);
    expect(assistantPayRoutes.void.params.safeParse({ id: 'c1' }).success).toBe(false);
  });

  it('narrows the ledger by assistant, status and when earned', () => {
    const q = { assistantId: ID, status: 'voided', from: '2026-10-01T00:00:00Z' };
    expect(assistantPayRoutes.ledger.query.parse(q)).toEqual(q);
    expect(assistantPayRoutes.ledger.query.safeParse({ status: 'paid' }).success).toBe(false);
  });

  it('needs a reason to void and a non-zero adjustment', () => {
    expect(assistantPayRoutes.void.body.safeParse({}).success).toBe(false);
    const zero = { assistantId: ID, amount: 0, currency: 'SAR', reason: 'late fix' };
    expect(assistantPayRoutes.adjust.body.safeParse(zero).success).toBe(false);
  });
});
