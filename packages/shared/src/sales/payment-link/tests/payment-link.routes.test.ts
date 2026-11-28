import { describe, expect, it } from 'vitest';
import { paymentLinkRoutes } from '../payment-link.routes';

const line = (r: { method: string; path: string }) => `${r.method} ${r.path}`;
const ID = '00000000-0000-4000-8000-0000000000c1';

const link = {
  id: ID,
  url: 'https://api.example.test/pay/tok',
  kind: 'new',
  status: 'open',
  amount: 120,
  currency: 'SAR',
  reference_price: 145,
  student: { id: ID, code: 'AB-0001', name: 'S' },
  subscription_id: null,
  package: '4',
  lessons: 4,
  duration: 90,
  expires_at: '2026-11-30T08:00:00.000Z',
  paid_at: null,
  created_at: '2026-11-27T08:00:00.000Z',
};

const quote = {
  quote: {
    package: 'weekly',
    lessons: 4,
    duration: 90,
    currency: 'SAR',
    discount: 0,
    afterDiscount: 145,
    perLesson: 36.25,
  },
  max_discount_pct: 20,
  min_amount: 116,
};

describe('paymentLinkRoutes', () => {
  it('keeps the paths the api serves today', () => {
    expect(Object.values(paymentLinkRoutes).map(line)).toEqual([
      'POST /sales/payment-links/quote',
      'POST /sales/payment-links',
      'GET /sales/payment-links',
      'POST /sales/payment-links/:id/cancel',
    ]);
  });

  it('lets in whoever handles their own sales money, under the sales tag', () => {
    for (const route of Object.values(paymentLinkRoutes)) {
      expect({ permissions: route.permissions, tags: route.tags }).toEqual({
        permissions: ['self.sales_money'],
        tags: ['sales'],
      });
    }
  });

  it('answers a link and a quote as the api builds them', () => {
    expect(paymentLinkRoutes.list.response.parse([link])).toEqual([link]);
    expect(paymentLinkRoutes.create.response.parse(link)).toEqual(link);
    expect(paymentLinkRoutes.cancel.response.parse({ ...link, status: 'cancelled' })).toEqual({
      ...link,
      status: 'cancelled',
    });
    expect(paymentLinkRoutes.quote.response.parse(quote)).toEqual(quote);
    const open = { ...quote, max_discount_pct: null, min_amount: null };
    expect(paymentLinkRoutes.quote.response.parse(open)).toEqual(open);
  });

  it('refuses a link of an unknown status, kind, package or duration', () => {
    const r = paymentLinkRoutes.list.response;
    expect(r.safeParse([{ ...link, status: 'processing' }]).success).toBe(false);
    expect(r.safeParse([{ ...link, kind: 'gift' }]).success).toBe(false);
    expect(r.safeParse([{ ...link, package: '5' }]).success).toBe(false);
    expect(r.safeParse([{ ...link, duration: 50 }]).success).toBe(false);
  });

  it('leaves the fx internals and the quote source out of the quote it answers', () => {
    const fx = { ...quote, quote: { ...quote.quote, country: 'SA', price: 145 } };
    expect(paymentLinkRoutes.quote.response.parse(fx)).toEqual(quote);
  });

  it('checks the status filter and the link id', () => {
    expect(paymentLinkRoutes.list.query.parse({})).toEqual({});
    expect(paymentLinkRoutes.list.query.safeParse({ status: 'lost' }).success).toBe(false);
    expect(paymentLinkRoutes.cancel.params.safeParse({ id: 'l1' }).success).toBe(false);
  });
});
