import { describe, expect, it } from 'vitest';
import { assistantStatementRoutes } from '../assistant-statements.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ID = '00000000-0000-4000-8000-0000000000b1';

const statement = {
  id: ID,
  assistant: { id: ID, name: 'A' },
  month: '2026-10-01',
  status: 'approved',
  totals: { SAR: { salary: 1000, commissions: 40, adjustments: -10, total: 1030 } },
  lines: [
    {
      kind: 'commission',
      amount: 40,
      currency: 'SAR',
      student: { code: 'AB-0001', name: 'S' },
      commission_kind: 'first',
      reason: null,
    },
  ],
  approved_at: '2026-11-01T08:00:00.000Z',
  paid_at: null,
  method: null,
  note: null,
  has_receipt: false,
};

describe('assistantStatementRoutes', () => {
  it('keeps the paths the api serves today, static segments first', () => {
    expect(Object.values(assistantStatementRoutes).map(line)).toEqual([
      'GET /assistant-pay/statements',
      'GET /assistant-pay/statements/:id',
      'GET /assistant-pay/statements/:id/receipt',
      'POST /assistant-pay/statements',
      'POST /assistant-pay/statements/:id/approve',
      'POST /assistant-pay/statements/:id/reopen',
      'POST /assistant-pay/statements/:id/pay',
      'POST /assistant-pay/statements/:id/unpay',
      'POST /assistant-pay/receipt-upload-url',
    ]);
  });

  it('answers a statement list and one statement as the api builds them', () => {
    expect(assistantStatementRoutes.list.response.parse([statement])).toEqual([statement]);
    expect(assistantStatementRoutes.approve.response.parse(statement)).toEqual(statement);
  });

  it('refuses a statement of an unknown status, line kind or method', () => {
    const r = assistantStatementRoutes.get.response;
    expect(r.safeParse({ ...statement, status: 'owed' }).success).toBe(false);
    const bonus = [{ ...statement.lines[0], kind: 'bonus' }];
    expect(r.safeParse({ ...statement, lines: bonus }).success).toBe(false);
    expect(r.safeParse({ ...statement, method: 'cheque' }).success).toBe(false);
  });

  it('takes a pay and an unpay sent without a body as an empty one', () => {
    expect(assistantStatementRoutes.pay.body.parse(undefined)).toEqual({});
    const unpay = assistantStatementRoutes.unpay.body.safeParse(undefined);
    expect(unpay.error?.issues[0]?.path).toEqual(['reason']);
  });

  it('refuses a statement id that is not a uuid and a receipt slot without its assistant', () => {
    expect(assistantStatementRoutes.get.params.safeParse({ id: 's1' }).success).toBe(false);
    const slot = { mime: 'application/pdf', size: 10 };
    expect(assistantStatementRoutes.receiptUploadUrl.body.safeParse(slot).success).toBe(false);
  });
});
