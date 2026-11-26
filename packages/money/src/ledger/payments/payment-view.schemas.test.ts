import { describe, expect, it } from 'vitest';
import { aPaymentView } from '../testing/views.builder';
import {
  paymentAttachmentListSchema,
  paymentAttachmentViewSchema,
  paymentsPageSchema,
  paymentViewSchema,
} from './payment-view.schemas';

const attachment = {
  id: 'a1',
  mime: 'image/png',
  size: 1024,
  url: 'https://files.test/a1',
  expires_at: '2026-11-01T11:00:00.000Z',
  legacy: false,
};

describe('paymentViewSchema', () => {
  it('accepts a payment as the API maps it', () => {
    const view = aPaymentView({ original: { amount: 10, currency: 'USD', fx_rate: 50 } });
    expect(paymentViewSchema.parse(view)).toEqual(view);
  });

  it('accepts a card payment recorded by nobody', () => {
    const view = aPaymentView({ method: 'card', recorded_by: null, invoice_id: 'i1' });
    expect(paymentViewSchema.parse(view)).toEqual(view);
  });

  it('rejects an amount sent as a string', () => {
    expect(paymentViewSchema.safeParse({ ...aPaymentView(), amount: '500' }).success).toBe(false);
  });

  it('rejects an unknown kind', () => {
    expect(paymentViewSchema.safeParse({ ...aPaymentView(), kind: 'gift' }).success).toBe(false);
  });

  it('rejects a payment without its student', () => {
    const { student: _student, ...rest } = aPaymentView();
    expect(paymentViewSchema.safeParse(rest).success).toBe(false);
  });
});

describe('paymentsPageSchema', () => {
  const page = { items: [aPaymentView()], total: 1, page: 1, pageSize: 25 };
  const totals = [{ currency: 'EGP', net: 400, payments: 500, refunds: 100 }];

  it('accepts a page with its totals per currency', () => {
    expect(paymentsPageSchema.parse({ ...page, totals })).toEqual({ ...page, totals });
  });

  it('rejects a page without totals', () => {
    expect(paymentsPageSchema.safeParse(page).success).toBe(false);
  });
});

describe('paymentAttachmentViewSchema', () => {
  it('accepts a signed attachment', () => {
    expect(paymentAttachmentViewSchema.parse(attachment)).toEqual(attachment);
  });

  it('accepts a legacy receipt with no mime or size', () => {
    const legacy = { ...attachment, mime: null, size: null, legacy: true };
    expect(paymentAttachmentViewSchema.parse(legacy)).toEqual(legacy);
  });

  it('rejects an attachment without a url', () => {
    const { url: _url, ...rest } = attachment;
    expect(paymentAttachmentViewSchema.safeParse(rest).success).toBe(false);
  });
});

describe('paymentAttachmentListSchema', () => {
  it('rejects a list with an attachment whose legacy flag is missing', () => {
    const { legacy: _legacy, ...rest } = attachment;
    expect(paymentAttachmentListSchema.safeParse([attachment, rest]).success).toBe(false);
  });
});
