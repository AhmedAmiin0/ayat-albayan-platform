// extract-crm [--since ISO]: CRM → cache/crm/<table>.json (+ cursor.json). Read-only; counts only.
// Without --since it re-reads everything; with it, rows changed since then merge into the cache by id.
import { cachePath, readJson, writeJson } from '../cache.ts';
import type { CrmRow } from '../types.ts';
import { type CrmReader, maxCursor, mergeById, selectAll } from './crm.ts';
import { CRM_TABLES } from './crm.schema.ts';

/** Per table: the newest cursor value extracted. `--since last` resumes from here. */
type CrmCursor = Record<string, string>;

interface ExtractCrmOptions {
  reader: CrmReader;
  /** ISO instant, or 'last' = per-table values from cache/crm/cursor.json. */
  since?: string;
  accountId?: string;
}

export async function extractCrm(opts: ExtractCrmOptions): Promise<Record<string, number>> {
  // The academy's account (the only one with data). Its id is the owner's: env only, never committed.
  const accountId = opts.accountId ?? process.env['CRM_ACCOUNT_ID'];
  if (!accountId) {
    throw new Error(
      'CRM_ACCOUNT_ID missing (tools/migrate/.env; value in .claude/artifacts/crm/crm.env)',
    );
  }
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
