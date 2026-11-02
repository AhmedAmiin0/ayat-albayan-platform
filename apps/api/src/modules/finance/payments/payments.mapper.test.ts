import { describe, expect, it } from 'vitest';
import { toPaymentWrite } from './payments.mapper';

describe('toPaymentWrite', () => {
  it('an empty patch writes nothing', () => {
    expect(toPaymentWrite({})).toEqual({});
  });

  it('maps each sent field to its column, a null receipt included', () => {
    const patch = {
      amount: 80,
      method: 'cash',
      paidAt: '2026-11-01T10:00:00Z',
      receiptPath: null,
      note: 'n',
    } as const;
    expect(toPaymentWrite(patch)).toEqual({
      amount: 80,
      method: 'cash',
      paid_at: '2026-11-01T10:00:00Z',
      receipt_path: null,
      note: 'n',
    });
  });

  it('skips the fields left out', () => {
    expect(toPaymentWrite({ note: 'only' })).toEqual({ note: 'only' });
  });
});
