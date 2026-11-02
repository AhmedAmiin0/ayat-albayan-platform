import type { FxService } from '@/modules/finance/fx/fx.service';
import { PricingService } from '@/modules/finance/pricing/pricing.service';
import { renewalPricing, type SubscriptionCreate } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { quoteQueryFor } from '@/modules/finance/subscriptions/subscriptions.dto';
import { subscriptionRow } from './subscription-row';

const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const input: SubscriptionCreate = {
  studentId: '5a000000-0000-4000-8000-000000000001',
  startsOn: '2026-10-01',
  pricing: { tier: 'weekly', duration: 45, discount: 10 },
};

async function rowFor(customPrice?: number) {
  const pricing = new PricingService({ rateSarTo: vi.fn() } as unknown as FxService);
  const quote = await pricing.quote(quoteQueryFor(input.pricing, 'SA'));
  const body = customPrice === undefined ? input : { ...input, customPrice };
  return { row: subscriptionRow(body, quote, ACTOR), quote };
}

describe('«مبلغ مخصص» on the package price (owner 2026-11-02)', () => {
  it('off: the quoted price after the discount, the quote as price_source (unchanged)', async () => {
    const { row, quote } = await rowFor();
    expect(row.price).toBe(quote.afterDiscount);
    expect(row.price_source).toEqual(quote);
  });

  it('on: the typed amount is the price; the quote is kept, marked custom with what it quoted', async () => {
    const { row, quote } = await rowFor(275.5);
    expect(row).toMatchObject({ price: 275.5, currency: quote.currency });
    expect(row.price_source).toEqual({ ...quote, source: 'custom', quoted: quote.afterDiscount });
  });

  it('a renewal of a custom-priced package still reads its tier, duration and discount', async () => {
    const { row } = await rowFor(99);
    const last = { price_source: row.price_source, lessons_total: row.lessons_total, duration: 45 };
    expect(renewalPricing(last as unknown as Parameters<typeof renewalPricing>[0])).toMatchObject({
      pkg: 'weekly',
      duration: 45,
      discount: 10,
    });
  });
});
