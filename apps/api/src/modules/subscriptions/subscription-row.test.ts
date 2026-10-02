import type { FxRate, SubscriptionCreate } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import type { FxService } from '../fx/fx.service';
import { PricingService } from '../pricing/pricing.service';
import { subscriptionRow } from './subscription-row';
import { quoteQueryFor } from './subscriptions.dto';

const ACTOR = 'a0000000-0000-4000-8000-000000000001';
const input: SubscriptionCreate = {
  studentId: '5a000000-0000-4000-8000-000000000001',
  startsOn: '2026-10-01',
  pricing: { tier: 'weekly', duration: 45, discount: 0 },
};
/** A stored SAR→USD rate from the provider (6 decimals, as open.er-api.com publishes it). */
const USD_RATE: FxRate = {
  quote: 'USD',
  rate: 0.266667,
  date: '2026-10-02T00:00:01Z',
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
};

/** S2's pricing path: the catalog quote for the country (real PricingService over a fake FX). */
async function rowFor(country: string, rate: FxRate = USD_RATE) {
  const fx = { rateSarTo: vi.fn().mockResolvedValue(rate) };
  const pricing = new PricingService(fx as unknown as FxService);
  const quote = await pricing.quote(quoteQueryFor(input.pricing, country));
  return { row: subscriptionRow(input, quote, ACTOR), fx };
}

describe('subscription FX snapshot (docs/08 §1, §4; R-SUB-01)', () => {
  it('a non-site country is priced in USD and keeps the SAR→USD rate that priced it', async () => {
    const { row, fx } = await rowFor('EG');
    expect(fx.rateSarTo).toHaveBeenCalledWith('USD');
    // weekly, 4 × 45 min: SAR 145 × 0.266667 → $39 (ceil)
    expect(row).toMatchObject({ currency: 'USD', price: 39, fx_rate: 0.266667, fx_date: '2026-10-02T00:00:01Z' });
    expect(row.price_source).toMatchObject({ currency: 'USD', fx: USD_RATE });
  });

  it('the peg fallback (no rate ever stored) is snapshotted too, with no provider date', async () => {
    const peg: FxRate = { quote: 'USD', rate: 1 / 3.75, date: null, provider: 'peg', fallback: true, ageHours: null };
    const { row } = await rowFor('GB', peg);
    expect(row).toMatchObject({ currency: 'USD', fx_rate: 1 / 3.75, fx_date: null });
    expect(row.price_source).toMatchObject({ fx: { provider: 'peg', fallback: true } });
  });

  it.each(['SA', 'AE', 'QA', 'KW', 'OM'])('%s keeps its own currency: no FX call, no snapshot', async (country) => {
    const { row, fx } = await rowFor(country);
    expect(fx.rateSarTo).not.toHaveBeenCalled();
    expect(row.currency).not.toBe('USD');
    expect(row).toMatchObject({ fx_rate: null, fx_date: null });
  });
});
