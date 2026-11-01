import { z } from 'zod';
import type { HttpFailure } from '@/common/infra/http/failure';
import { createHttp } from '@/common/infra/http/http';

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
// open.er-api.com (`rates`) and the keyed v6.exchangerate-api.com (`conversion_rates`) share this
// shape; either map becomes `rates`, and one of them must be there.
const response = z
  .looseObject({
    result: z.literal('success'),
    base_code: z.literal('SAR'),
    time_last_update_unix: z.number().int().positive(),
    rates: rateMap.optional(),
    conversion_rates: rateMap.optional(),
  })
  .transform((b) => ({ rates: b.rates ?? b.conversion_rates, unix: b.time_last_update_unix }))
  .pipe(z.object({ rates: rateMap, unix: z.number() }));

/** FX_API_URL may hold the key: the message names the status or the kind only, never the URL. */
const FX_ERRORS = {
  default: (f: HttpFailure) => new Error(`fx: ${f.kind === 'status' ? `HTTP ${f.status}` : f.kind}`),
};

/** ExchangeRate-API (docs/08 §4). FX_API_URL must point at a SAR-based "latest" endpoint. */
export class OpenErApiFetcher implements FxFetcher {
  private readonly http;

  constructor(private readonly url: string) {
    this.http = createHttp({
      name: 'fx',
      base: () => url,
      headers: () => Promise.resolve({}),
      timeoutMs: TIMEOUT_MS,
      redirect: 'follow',
      errorBody: 'omit',
      errors: FX_ERRORS,
    });
  }

  async latest(): Promise<FxSnapshot> {
    const body = await this.http.json({ path: '', schema: response });
    return {
      base: 'SAR',
      rates: body.rates,
      updatedAt: new Date(body.unix * 1000).toISOString(),
      provider: new URL(this.url).host,
    };
  }
}
