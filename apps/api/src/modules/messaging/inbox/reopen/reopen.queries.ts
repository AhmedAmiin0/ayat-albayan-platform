import { REOPEN_TEMPLATE_KEY } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';

/** The reopen dedupe's read (the per-day dedup_key is the write side's). */
@Injectable()
export class ReopenQueries {
  constructor(@Inject(DB) private readonly db: Db) {}

  /**
   * Any reopen template row (`reopen:` dedup key) for this phone since `since` (whatever its status), or
   * one still queued from any day (a closed gate holds it: another would go out with it).
   */
  async requestedSince(phone: string, since: Date): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('template_key', REOPEN_TEMPLATE_KEY)
      .like('dedup_key', 'reopen:%')
      .or(`created_at.gte.${since.toISOString()},status.eq.queued`)
      .limit(1);
    if (error) throw new Error(`reopen read failed: ${error.message}`);
    return data.length > 0;
  }
}
