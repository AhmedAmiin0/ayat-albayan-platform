// extract-crm [--since ISO]: CRM → cache/crm/<table>.json (+ cursor.json). Read-only; counts only.
// Without --since it re-reads everything; with it, rows changed since then merge into the cache by id.
import { cachePath, readJson, writeJson } from '../cache.ts';
import type { CrmRow } from '../types.ts';
import { type CrmReader, maxCursor, mergeById, selectAll } from './crm.ts';
import { CRM_TABLES, DEFAULT_CRM_ACCOUNT_ID } from './crm.schema.ts';

/** Per table: the newest cursor value extracted. `--since last` resumes from here. */
export type CrmCursor = Record<string, string>;

export interface ExtractCrmOptions {
  reader: CrmReader;
  /** ISO instant, or 'last' = per-table values from cache/crm/cursor.json. */
  since?: string;
  accountId?: string;
}

export async function extractCrm(opts: ExtractCrmOptions): Promise<Record<string, number>> {
  const accountId = opts.accountId ?? process.env['CRM_ACCOUNT_ID'] ?? DEFAULT_CRM_ACCOUNT_ID;
  const cursor = readJson<CrmCursor>(cachePath.crmCursor(), {});
  const counts: Record<string, number> = {};
  for (const spec of CRM_TABLES) {
    const since = opts.since === 'last' ? cursor[spec.table] : opts.since;
    const fresh = await selectAll(opts.reader, { spec, accountId, since });
    const cached = since ? readJson<CrmRow[]>(cachePath.crm(spec.table), []) : [];
    const rows = mergeById(cached, fresh);
    writeJson(cachePath.crm(spec.table), rows);
    const top = maxCursor(rows, spec.cursor);
    if (top) cursor[spec.table] = top;
    counts[spec.table] = rows.length;
  }
  writeJson(cachePath.crmCursor(), cursor);
  return counts;
}
