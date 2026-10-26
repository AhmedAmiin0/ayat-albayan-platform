import type { FxRate } from '@ab/shared';
import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { FxService } from '../../../finance/fx/fx.service';
import { FxConverter } from './fx-converter';

const rate = (quote: string, r: number): FxRate => ({
  quote,
  rate: r,
  date: '2026-10-01T00:00:00Z',
  provider: 'open.er-api.com',
  fallback: false,
  ageHours: null,
});

function converter(rates: Record<string, number>) {
  const rateSarTo = vi.fn(async (quote: string) => {
    const r = rates[quote];
    if (r === undefined) throw new ServiceUnavailableException({ code: 'fx_unavailable', quote });
    return rate(quote, r);
  });
  return { conv: new FxConverter({ rateSarTo } as unknown as FxService), rateSarTo };
}

describe('FxConverter', () => {
  it('everything already in the reporting currency: no rate is read', async () => {
    const { conv, rateSarTo } = converter({});
    const c = await conv.conversion('SAR', ['SAR', 'SAR']);
    expect(rateSarTo).not.toHaveBeenCalled();
    expect(c).toEqual({ currency: 'SAR', rates: { SAR: 1 }, missing: [], date: null });
  });

  it('reads one rate per other currency (SAR itself is never asked for)', async () => {
    const { conv, rateSarTo } = converter({ EGP: 13, USD: 0.2667 });
    const c = await conv.conversion('SAR', ['EGP', 'USD', 'EGP']);
    expect(rateSarTo.mock.calls.map((a) => a[0]).sort()).toEqual(['EGP', 'USD']);
    expect(c.rates).toEqual({ SAR: 1, EGP: 13, USD: 0.2667 });
    expect(c.date).toBe('2026-10-01T00:00:00Z');
  });

  it('fx_unavailable → the currency is listed as missing, not an error', async () => {
    const { conv } = converter({ EGP: 13 });
    const c = await conv.conversion('SAR', ['EGP', 'KWD']);
    expect(c.missing).toEqual(['KWD']);
  });

  it('any other failure propagates', async () => {
    const rateSarTo = vi.fn(async () => {
      throw new Error('db down');
    });
    const conv = new FxConverter({ rateSarTo } as unknown as FxService);
    await expect(conv.conversion('SAR', ['EGP'])).rejects.toThrow('db down');
  });
});
