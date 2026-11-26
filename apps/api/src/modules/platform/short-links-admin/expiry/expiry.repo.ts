import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { rows } from '@/common/db/errors';
import { MANAGED_KIND } from '@/modules/platform/short-links';

/**
 * The cron's two writes on managed links only (docs/19): system links keep their own expiry
 * (checked on every open) and are never stopped or deleted here. Both are idempotent by cutoff.
 */
@Injectable()
export class LinkExpiryRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** active → expired once past expires_at; the number of links stopped. */
  async expire(now: Date): Promise<number> {
    const data = rows(await this.db
      .from('short_links')
      .update({ status: 'expired' })
      .eq('kind', MANAGED_KIND)
      .eq('status', 'active')
      .lte('expires_at', now.toISOString())
      .select('code'));
    return data.length;
  }

  /** Deletes managed links that expired before `cutoff` (their users and visits cascade). */
  async purge(cutoff: Date): Promise<number> {
    const data = rows(await this.db
      .from('short_links')
      .delete()
      .eq('kind', MANAGED_KIND)
      .lt('expires_at', cutoff.toISOString())
      .select('code'));
    return data.length;
  }
}
