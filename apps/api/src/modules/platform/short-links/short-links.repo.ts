import type { Tables } from '@ab/db';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import { dbError } from '@/common/http/http';

export type ShortLinkRow = Tables<'short_links'>;
interface Key {
  kind: string;
  subject: string;
}
interface Target {
  target_url: string;
  expires_at: string | null;
}

/** Postgres unique_violation: another writer made the row first. */
const UNIQUE = '23505';

/**
 * public.short_links (migration 20261105000300): service role only, RLS on with no client policy.
 */
@Injectable()
export class ShortLinksRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  async byCode(code: string): Promise<ShortLinkRow | null> {
    const { data, error } = await this.db
      .from('short_links')
      .select('*')
      .eq('code', code)
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /** The row of (kind, subject) with its target refreshed; null when there is none yet. */
  async refresh(key: Key, target: Target): Promise<ShortLinkRow | null> {
    const { data, error } = await this.db
      .from('short_links')
      .update(target)
      .match(key)
      .select('*')
      .maybeSingle();
    if (error) throw dbError(error);
    return data;
  }

  /**
   * The new row; null when (kind, subject) or the code already exists (the caller refreshes or
   * retries).
   */
  async insert(row: Key & Target & { code: string }): Promise<ShortLinkRow | null> {
    const { data, error } = await this.db.from('short_links').insert(row).select('*').maybeSingle();
    if (error?.code === UNIQUE) return null;
    if (error) throw dbError(error);
    return data;
  }
}
