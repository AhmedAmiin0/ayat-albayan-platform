import { describe, expect, it } from 'vitest';
import { invoiceViewSchema } from './invoice-view.schemas';

const view = {
  id: 'e3333333-3333-4333-8333-333333333333',
  rule_id: 'e1111111-1111-4111-8111-111111111111',
  kind: 'package',
  mime: 'image/png',
  size_bytes: 2048,
  source: 'upload',
  created_at: '2026-10-03T09:00:00.000Z',
  students: [{ id: 'e2222222-2222-4222-8222-222222222222', name: 'سهيلة', code: 'AB-0183' }],
};

describe('invoiceViewSchema (GET /invoices, R-PAY-03)', () => {
  it('reads a booking invoice, with or without its payment', () => {
    expect(invoiceViewSchema.parse(view)).toEqual(view);
    expect(invoiceViewSchema.parse({ ...view, payment_id: null })).toEqual({ ...view, payment_id: null });
  });

  it('drops the storage path, which never goes to a client', () => {
    expect(invoiceViewSchema.parse({ ...view, storage_path: 'r/a.png' })).toEqual(view);
  });

  it('rejects a trial invoice, an unknown source and a local time', () => {
    expect(invoiceViewSchema.safeParse({ ...view, kind: 'trial' }).success).toBe(false);
    expect(invoiceViewSchema.safeParse({ ...view, source: 'email' }).success).toBe(false);
    const local = { ...view, created_at: '2026-10-03T09:00:00' };
    expect(invoiceViewSchema.safeParse(local).success).toBe(false);
  });
});
