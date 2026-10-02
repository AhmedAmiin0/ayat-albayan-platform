// READ-ONLY access to the owner's CRM. The reader exposes paged SELECTs and nothing else, so no
// code path in this package can insert/update/delete there (owner rule: never write to the CRM).
import { createClient } from '@supabase/supabase-js';
import type { CrmRow } from '../types.ts';
import type { CrmTableSpec } from './crm.schema.ts';

export const PAGE = 1000; // PostgREST max rows per request

export interface CrmPageQuery {
  spec: CrmTableSpec;
  accountId: string;
  /** ISO instant: only rows with spec.cursor >= since. */
  since?: string;
  page: number;
}

export interface CrmReader {
  selectPage(q: CrmPageQuery): Promise<CrmRow[]>;
}

export function crmReaderFromEnv(env: NodeJS.ProcessEnv): CrmReader {
  const url = env['CRM_SUPABASE_URL'];
  const key = env['CRM_SUPABASE_SERVICE_KEY'];
  if (!url || !key)
    throw new Error('CRM_SUPABASE_URL / CRM_SUPABASE_SERVICE_KEY missing (tools/migrate/.env)');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return {
    async selectPage(q) {
      let query = db.from(q.spec.table).select(q.spec.select).eq(q.spec.account, q.accountId);
      if (q.since) query = query.gte(q.spec.cursor, q.since);
      const from = q.page * PAGE;
      const { data, error } = await query
        .order(q.spec.cursor, { ascending: true })
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`CRM ${q.spec.table}: ${error.message}`);
      return (data ?? []) as unknown as CrmRow[];
    },
  };
}

/** Every page of one table. */
export async function selectAll(
  reader: CrmReader,
  q: Omit<CrmPageQuery, 'page'>,
): Promise<CrmRow[]> {
  const rows: CrmRow[] = [];
  for (let page = 0; ; page++) {
    const batch = await reader.selectPage({ ...q, page });
    rows.push(...batch);
    if (batch.length < PAGE) return rows;
  }
}

const FILTER_EMBEDS = new Set(['conversations', 'contacts', 'pipelines']);

/** Delta merge by id: newer rows replace cached ones; embeds used only for filtering are dropped. */
export function mergeById(cached: readonly CrmRow[], fresh: readonly CrmRow[]): CrmRow[] {
  const byId = new Map(cached.map((r) => [String(r['id']), r]));
  for (const r of fresh) {
    const row = Object.fromEntries(Object.entries(r).filter(([k]) => !FILTER_EMBEDS.has(k)));
    byId.set(String(row['id']), row);
  }
  return [...byId.values()];
}

/** Max cursor value seen (ISO strings sort chronologically). */
export function maxCursor(rows: readonly CrmRow[], column: string): string | undefined {
  let max: string | undefined;
  for (const r of rows) {
    const v = r[column];
    if (typeof v === 'string' && (!max || v > max)) max = v;
  }
  return max;
}
