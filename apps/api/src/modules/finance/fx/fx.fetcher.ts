import { z } from 'zod';

/** Injection token for the rate source; tests bind a fake so no unit or e2e test hits the network. */
export const FX_FETCHER = Symbol('FX_FETCHER');

/** One provider update: SAR → every quote currency. */
export interface FxSnapshot {
  base: 'SAR';
  rates: Record<string, number>;
  /** When the provider published these rates (ISO). */
  updatedAt: string;
  /** Host of FX_API_URL, e.g. "open.er-api.com" (never the path: a keyed URL holds the key). */
  provider: string;
}

export interface FxFetcher {
  latest(): Promise<FxSnapshot>;
}

// A quote waits for this call (at most once per retry window), so keep it short.
const TIMEOUT_MS = 3_000;
const rateMap = z.record(z.string(), z.number());
// open.er-api.com (`rates`) and the keyed v6.exchangerate-api.com (`conversion_rates`) share this shape.
const response = z.object({
  result: z.literal('success'),
  base_code: z.literal('SAR'),
  time_last_update_unix: z.number().int().positive(),
  rates: rateMap.optional(),
  conversion_rates: rateMap.optional(),
});

/** ExchangeRate-API (docs/08 §4). FX_API_URL must point at a SAR-based "latest" endpoint. */
export class OpenErApiFetcher implements FxFetcher {
  constructor(private readonly url: string) {}

  async latest(): Promise<FxSnapshot> {
    const res = await fetch(this.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) throw new Error(`fx: HTTP ${res.status}`);
    const body = response.parse(await res.json());
    const rates = body.rates ?? body.conversion_rates;
    if (!rates) throw new Error('fx: response has no rates');
    return {
      base: 'SAR',
      rates,
      updatedAt: new Date(body.time_last_update_unix * 1000).toISOString(),
      provider: new URL(this.url).host,
    };
  }
}
