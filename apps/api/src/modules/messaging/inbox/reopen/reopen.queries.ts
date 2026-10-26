import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '../../../../common/db/db.module';
import { ReopenSettings } from './reopen.settings';

/** The reopen's reads: the configured template and the dedupe (the per-day dedup_key is the write side's). */
@Injectable()
export class ReopenQueries {
  constructor(
    @Inject(DB) private readonly db: Db,
    private readonly settings: ReopenSettings,
  ) {}

  /** The `chat_reopen_template` setting (default inquiry_followup_ar_v2; no fallback key). */
  async templateKey(): Promise<string> {
    return (await this.settings.read()).chat_reopen_template;
  }

  /**
   * Any row of the configured reopen template `key` (`reopen:` dedup key) for this phone since `since`
   * (whatever its status), or one still queued from any day (a closed gate holds it: another would go out with it).
   */
  async requestedSince(phone: string, since: Date, key: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('messages')
      .select('id')
      .eq('phone_e164', phone)
      .eq('template_key', key)
      .like('dedup_key', 'reopen:%')
      .or(`created_at.gte.${since.toISOString()},status.eq.queued`)
      .limit(1);
    if (error) throw new Error(`reopen read failed: ${error.message}`);
    return data.length > 0;
  }
}
