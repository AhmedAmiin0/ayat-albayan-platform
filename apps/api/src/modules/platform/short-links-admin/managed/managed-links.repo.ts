import type { TablesInsert, TablesUpdate } from '@ab/db';
import type { ShortLinkListQuery } from '@ab/shared';
import { Inject, Injectable } from '@nestjs/common';
import { DB, type Db } from '@/common/db/db.module';
import type { SortSpec } from '@/common/db/list-sort';
import { readPage } from '@/common/db/page';
import { isUniqueViolation, maybe, one, pgError } from '@/common/db/errors';
import { MANAGED_KIND, type ShortLinkRow } from '@/modules/platform/short-links';

/** Postgres unique_violation: the code already exists (the caller draws another). */

const NEWEST_FIRST: SortSpec<never> = {
  columns: {},
  fallback: [{ column: 'created_at', ascending: false }],
};

interface ListScope {
  query: ShortLinkListQuery;
  /** null = every owner (short_links.all); else only this creator's links. */
  owner: string | null;
}

/** The equality filters of a page: the scope's owner wins over the query's (own-only users). */
const filtersOf = (scope: ListScope): Record<string, string> => {
  const owner = scope.owner ?? scope.query.owner;
  const status = scope.query.status;
  return { ...(owner ? { created_by: owner } : {}), ...(status ? { status } : {}) };
};

/** LIKE pattern of a search: `%`, `_` and `\` escaped. */
const like = (s: string): string => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

/**
 * The managed rows of public.short_links (kind 'managed', docs/19): service role only, RLS on with
 * no client policy. System links (other kinds) are never read or written here.
 */
@Injectable()
export class ManagedLinksRepo {
  constructor(@Inject(DB) private readonly db: Db) {}

  /** The new row; null when the code is taken (astronomically rare). */
  async insert(row: TablesInsert<'short_links'>): Promise<ShortLinkRow | null> {
    const { data, error } = await this.db.from('short_links').insert(row).select('*').maybeSingle();
    if (isUniqueViolation(error)) return null;
    if (error) throw pgError(error);
    return data;
  }

  async byCode(code: string): Promise<ShortLinkRow | null> {
    const data = maybe(await this.db
      .from('short_links')
      .select('*')
      .eq('kind', MANAGED_KIND)
      .eq('code', code)
      .maybeSingle());
    return data;
  }

  async update(code: string, patch: TablesUpdate<'short_links'>): Promise<ShortLinkRow> {
    const data = one(await this.db
      .from('short_links')
      .update(patch)
      .eq('kind', MANAGED_KIND)
      .eq('code', code)
      .select('*')
      .single());
    return data;
  }

  /** One page, newest first, with the total. */
  async page(scope: ListScope): Promise<{ rows: ShortLinkRow[]; total: number }> {
    const { query } = scope;
    const read = () =>
      this.db
        .from('short_links')
        .select('*', { count: 'exact' })
        .match({ kind: MANAGED_KIND, ...filtersOf(scope) })
        .ilike('title', like(query.search ?? ''));
    return readPage(read, query, NEWEST_FIRST);
  }
}
