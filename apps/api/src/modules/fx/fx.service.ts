import { SAR_PER_USD_PEG, type FxRate } from '@ab/shared';
import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { FX_FETCHER, type FxFetcher, type FxSnapshot } from './fx.fetcher';
import { FxQueries, type FxRow } from './fx.queries';
import { FxSettings } from './fx.settings';

const HOUR_MS = 3_600_000;
/** After a failed call the provider is left alone this long (it is rate-limited: docs/08 §4). */
const RETRY_MS = 30 * 60_000;
/** SAR is pegged at 3.75 per USD; a provider USD rate further off than this is a provider fault. */
const USD_TOLERANCE = 0.05;

/**
 * SAR→X rates (docs/08 §4): a rate fetched < settings.fx_fresh_hours (24) ago is reused; otherwise the API is read and
 * stored; if it fails, the newest stored rate (with its age); if none, USD falls back to the peg.
 * A failed call (or a failed save) is not retried for RETRY_MS: quotes use the fallbacks meanwhile.
 */
@Injectable()
export class FxService {
  private readonly log = new Logger(FxService.name);
  private inflight: Promise<FxSnapshot> | null = null;
  private failedAt = Number.NEGATIVE_INFINITY;

  constructor(
    @Inject(FX_FETCHER) private readonly fetcher: FxFetcher,
    private readonly queries: FxQueries,
    private readonly settings: FxSettings,
  ) {}

  async rateSarTo(quote: string): Promise<FxRate> {
    const stored = await this.queries.newest(quote);
    const freshMs = (await this.settings.read()).fx_fresh_hours * HOUR_MS;
    if (stored && Date.now() - Date.parse(stored.fetched_at) < freshMs) return fromRow(stored, false);
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

  /** The rate in force at `at` (a stored rate, else today's); SAR itself is 1. */
  async rateSarAt(quote: string, at: string): Promise<FxRate> {
    if (quote === 'SAR') return { quote, rate: 1, date: null, provider: 'self', fallback: false, ageHours: null };
    const stored = await this.queries.atOrBefore(quote, at);
    return stored ? fromRow(stored, false) : this.rateSarTo(quote);
  }

  /** One API call at a time: concurrent stale quotes share the same in-flight request. */
  private refresh(): Promise<FxSnapshot> {
    if (Date.now() - this.failedAt < RETRY_MS) {
      return Promise.reject(new Error('fx: provider failed < 30 min ago, not retried yet'));
    }
    this.inflight ??= this.fetchAndStore().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async fetchAndStore(): Promise<FxSnapshot> {
    let snap: FxSnapshot;
    try {
      snap = plausible(await this.fetcher.latest());
    } catch (err) {
      this.failedAt = Date.now();
      throw err;
    }
    // A rate that could not be stored is still a good rate for this quote.
    await this.queries.save(snap).catch((err: unknown) => {
      this.failedAt = Date.now();
      this.log.warn(`fx save failed: ${err instanceof Error ? err.message : String(err)}`);
    });
    return snap;
  }
}

/** Rejects provider faults: a SAR→USD rate far from the peg, or a publication time in the future. */
function plausible(snap: FxSnapshot): FxSnapshot {
  const usd = snap.rates['USD'];
  if (usd !== undefined && !(Math.abs(usd * SAR_PER_USD_PEG - 1) <= USD_TOLERANCE)) {
    throw new Error(`fx: implausible SAR→USD rate ${usd}`);
  }
  if (Date.parse(snap.updatedAt) > Date.now() + HOUR_MS) {
    throw new Error(`fx: provider update time ${snap.updatedAt} is in the future`);
  }
  return snap;
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
