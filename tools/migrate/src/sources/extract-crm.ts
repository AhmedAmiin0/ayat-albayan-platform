// extract-crm [--since ISO]: CRM → cache/crm/<table>.json (+ cursor.json). Read-only; counts only.
// Without --since it re-reads everything; with it, rows changed since then merge into the cache by id.
import { cachePath, readJson, writeJson } from '../cache.ts';
import type { CrmRow } from '../types.ts';
import { type CrmReader, maxCursor, mergeById, selectAll } from './crm.ts';
import { CRM_TABLES, type CrmTableSpec } from './crm.schema.ts';

/** Per table: the newest cursor value extracted. `--since last` resumes from here. */
type CrmCursor = Record<string, string>;

interface ExtractCrmOptions {
  reader: CrmReader;
  /** ISO instant, or 'last' = per-table values from cache/crm/cursor.json. */
  since?: string;
  accountId?: string;
}

function accountIdOf(opts: ExtractCrmOptions): string {
  // The academy's account (the only one with data). Its id is the owner's: env only, never committed.
  const accountId = opts.accountId ?? process.env.CRM_ACCOUNT_ID;
  if (!accountId) {
    throw new Error(
      'CRM_ACCOUNT_ID missing (tools/migrate/.env; value in .claude/artifacts/crm/crm.env)',
    );
  }
  return accountId;
}

/** One table into its cache file; moves `cursor` to its newest row. Returns its row count. */
async function extractTable(
  opts: ExtractCrmOptions & { accountId: string },
  spec: CrmTableSpec,
  cursor: CrmCursor,
): Promise<number> {
  const since = opts.since === 'last' ? cursor[spec.table] : opts.since;
  const fresh = await selectAll(opts.reader, { spec, accountId: opts.accountId, since });
  const cached = since ? readJson<CrmRow[]>(cachePath.crm(spec.table), []) : [];
  const rows = mergeById(cached, fresh);
  writeJson(cachePath.crm(spec.table), rows);
  const top = maxCursor(rows, spec.cursor);
  if (top) cursor[spec.table] = top;
  return rows.length;
}

export async function extractCrm(opts: ExtractCrmOptions): Promise<Record<string, number>> {
  const accountId = accountIdOf(opts);
  const cursor = readJson<CrmCursor>(cachePath.crmCursor(), {});
  const counts: Record<string, number> = {};
  for (const spec of CRM_TABLES) {
    counts[spec.table] = await extractTable({ ...opts, accountId }, spec, cursor);
  }
  writeJson(cachePath.crmCursor(), cursor);
  return counts;
}
