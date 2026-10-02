import type { Db } from '../../common/db/db.module';

// Test-only supabase-js double: every builder call is recorded per `from(table)`, and awaiting the
// chain resolves to the next queued result for that table ({ data: [], error: null } by default).

export type Result = { data?: unknown; error?: { message: string } | null };
export type ChainLog = { table: string; calls: [string, unknown[]][] };

export function chainDb(results: Record<string, Result[]> = {}) {
  const log: ChainLog[] = [];
  const from = (table: string) => {
    const entry: ChainLog = { table, calls: [] };
    log.push(entry);
    const chain: object = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            const result = results[table]?.shift() ?? {};
            return (resolve: (v: unknown) => void) => resolve({ data: [], error: null, ...result });
          }
          return (...args: unknown[]) => {
            entry.calls.push([String(prop), args]);
            return chain;
          };
        },
      },
    );
    return chain;
  };
  return { db: { from } as unknown as Db, log };
}

/** The calls of the n-th `from(table)` (0-based). */
export function callsOf(log: readonly ChainLog[], table: string, n = 0): [string, unknown[]][] {
  return log.filter((l) => l.table === table)[n]?.calls ?? [];
}
