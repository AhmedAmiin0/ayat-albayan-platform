import type { Tables, TablesInsert } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../common/db/db.module';
import type { FxSnapshot } from './fx.fetcher';

export type FxRow = Tables<'fx_rates'>;

const CURRENCY = /^[A-Z]{3}$/;

/** fx_rates access (service role; the table is admin-read-only under RLS). */
@Injectable()
export class FxQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** Most recently fetched SAR→quote rate, any age. */
  async newest(quote: string): Promise<FxRow | null> {
    const { data, error } = await this.db
      .from('fx_rates')
      .select('*')
      .eq('base', 'SAR')
      .eq('quote', quote)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(`db: ${error.message}`);
    return data;
  }

  /**
   * Stores every rate of a provider update. Re-reading an update already stored only bumps
   * fetched_at, so the next refresh waits a full day again (docs/08 §4: fetch once per window).
   */
  async save(snap: FxSnapshot): Promise<void> {
    const fetched_at = new Date().toISOString();
    const rows: TablesInsert<'fx_rates'>[] = Object.entries(snap.rates)
      .filter(([quote, rate]) => CURRENCY.test(quote) && rate > 0)
      .map(([quote, rate]) => ({
        base: snap.base,
        quote,
        rate,
        provider: snap.provider,
        provider_updated_at: snap.updatedAt,
        fetched_at,
      }));
    const { error } = await this.db
      .from('fx_rates')
      .upsert(rows, { onConflict: 'base,quote,provider_updated_at' });
    if (error) throw new Error(`db: ${error.message}`);
  }
}
