import { describe, expect, it } from 'vitest';
import { receivablesViewSchema } from '../receivables';

const row = {
  id: 's1',
  student: { id: 'st1', code: 'AB-0001', name: 'Ali' },
  guardian: { name: 'Omar', phone_e164: '+966500000000' },
  price: 300,
  currency: 'SAR',
  starts_on: '2026-10-01',
  status: 'active',
  cancel_kind: null,
  stop_owed_amount: null,
  paid: 100,
  owed: 200,
  days_overdue: 40,
  bucket: '31_60',
};

const view = {
  rows: [row],
  totals: [
    { currency: 'SAR', owed: 200, buckets: { '0_30': 0, '31_60': 200, '61_90': 0, '90_plus': 0 } },
  ],
  total: 200,
  currency: 'SAR',
  fx_missing: [],
};

describe('receivablesViewSchema (GET /receivables)', () => {
  it('reads the answer back unchanged', () => {
    expect(receivablesViewSchema.parse(view)).toEqual(view);
  });

  it('keeps a row without a guardian or a stop', () => {
    const { cancel_kind: _c, stop_owed_amount: _s, ...bare } = row;
    const answer = { ...view, rows: [{ ...bare, guardian: null }] };
    expect(receivablesViewSchema.parse(answer)).toEqual(answer);
  });

  it.each([
    ['an unknown bucket', { ...view, rows: [{ ...row, bucket: '120' }] }],
    ['a text amount', { ...view, rows: [{ ...row, owed: '200' }] }],
    ['no fx_missing', { ...view, fx_missing: undefined }],
    ['a total bucket missing', { ...view, totals: [{ currency: 'SAR', owed: 1, buckets: {} }] }],
  ])('refuses %s', (_name, answer) => {
    expect(receivablesViewSchema.safeParse(answer).success).toBe(false);
  });
});
