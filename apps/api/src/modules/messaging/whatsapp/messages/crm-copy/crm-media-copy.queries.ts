import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../../common/db/db.module';

/** The totals of a finished copy (its one audit row). */
export type CrmCopyCounts = { copied: number; failed: number; skipped: number };

const count = (v: unknown): number => (typeof v === 'number' ? v : 0);

/** CrmMediaCopyJob's three statements (migration 880; service role). */
@Injectable()
export class CrmMediaCopyQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * The next imported CRM rows on `host` still without a copy, oldest first: never a skipped row or
   * one at `maxAttempts`. Reads messages_crm_link_uncopied_idx only (empty once all are copied).
   */
  async batch(input: { host: string; limit: number; maxAttempts: number }): Promise<string[]> {
    const { data, error } = await this.db.rpc('crm_media_copy_batch', {
      p_host: input.host,
      p_limit: input.limit,
      p_max_attempts: input.maxAttempts,
    });
    if (error) throw new Error(`crm media copy batch failed: ${error.message}`);
    return data.map((r) => r.id);
  }

  /** One more failed attempt (or a skip: never selected again); the attempts so far. */
  async mark(input: { id: string; error: string; skip: boolean }): Promise<number> {
    const { data, error } = await this.db.rpc('crm_media_copy_mark', {
      p_message: input.id,
      p_error: input.error,
      p_skip: input.skip,
    });
    if (error) throw new Error(`crm media copy mark failed: ${error.message}`);
    return data;
  }

  async counts(host: string): Promise<CrmCopyCounts> {
    const { data, error } = await this.db.rpc('crm_media_copy_counts', { p_host: host });
    if (error) throw new Error(`crm media copy counts failed: ${error.message}`);
    const row = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return { copied: count(row.copied), failed: count(row.failed), skipped: count(row.skipped) };
  }
}
