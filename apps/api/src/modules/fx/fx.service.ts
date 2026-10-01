import { SAR_PER_USD_PEG, type FxRate } from '@ab/shared';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { FX_FETCHER, type FxFetcher, type FxSnapshot } from './fx.fetcher';
import { FxQueries, type FxRow } from './fx.queries';

const HOUR_MS = 3_600_000;
const FRESH_MS = 24 * HOUR_MS;

/**
 * SAR→X rates (docs/08 §4): a rate fetched < 24 h ago is reused; otherwise the API is read and
 * stored; if it fails, the newest stored rate (with its age); if none, USD falls back to the peg.
 */
@Injectable()
export class FxService {
  private readonly log = new Logger(FxService.name);
  private inflight: Promise<FxSnapshot> | null = null;

  constructor(
    @Inject(FX_FETCHER) private readonly fetcher: FxFetcher,
    private readonly queries: FxQueries,
  ) {}

  async rateSarTo(quote: string): Promise<FxRate> {
    const stored = await this.queries.newest(quote);
    if (stored && Date.now() - Date.parse(stored.fetched_at) < FRESH_MS) return fromRow(stored, false);
    try {
      const snap = await this.refresh();
      const rate = snap.rates[quote];
      if (!rate || rate <= 0) throw new Error(`fx: provider has no SAR→${quote} rate`);
      return { quote, rate, date: snap.updatedAt, provider: snap.provider, fallback: false, ageHours: null };
    } catch (err) {
      this.log.warn(`fx refresh failed: ${err instanceof Error ? err.message : String(err)}`);
      if (stored) return fromRow(stored, true);
      if (quote === 'USD') return PEG;
      throw new ServiceUnavailableException({ code: 'fx_unavailable', quote });
    }
  }

  /** One API call at a time: concurrent stale quotes share the same in-flight request. */
  private refresh(): Promise<FxSnapshot> {
    this.inflight ??= this.fetchAndStore().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchAndStore(): Promise<FxSnapshot> {
    const snap = await this.fetcher.latest();
    await this.queries.save(snap);
    return snap;
  }
}

const PEG: FxRate = {
  quote: 'USD',
  rate: 1 / SAR_PER_USD_PEG,
  date: null,
  provider: 'peg',
  fallback: true,
  ageHours: null,
};

function fromRow(row: FxRow, stale: boolean): FxRate {
  const age = Math.floor((Date.now() - Date.parse(row.provider_updated_at)) / HOUR_MS);
  return {
    quote: row.quote,
    rate: Number(row.rate),
    date: row.provider_updated_at,
    provider: row.provider,
    fallback: false,
    ageHours: stale ? age : null,
  };
}
