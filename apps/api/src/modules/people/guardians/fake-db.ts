import type { Db } from '../../../common/db/db.module';

// Test helper (not a test): a chainable stand-in for the supabase-js query builder.

export type FakeResult = {
  data?: unknown;
  error?: { code?: string; message: string } | null;
  count?: number | null;
};
type FakeCall = { table: string; method: string; args: unknown[] };

/**
 * Every builder method is recorded and chains; awaiting a query on `table` resolves to the
 * next queued result for that table (rpc calls queue under `rpc:<fn>`).
 */
export function fakeDb(results: Record<string, FakeResult[]>) {
  const calls: FakeCall[] = [];
  const builder = (table: string): unknown => {
    const proxy: unknown = new Proxy(
      {},
      {
        get(_target, prop) {
          if (prop === 'then') {
            const r = results[table]?.shift() ?? {};
            const value = { data: r.data ?? null, error: r.error ?? null, count: r.count ?? null };
            return (resolve: (v: unknown) => unknown) => resolve(value);
          }
          return (...args: unknown[]) => {
            calls.push({ table, method: String(prop), args });
            return proxy;
          };
        },
      },
    );
    return proxy;
  };
  const db = {
    from: (table: string) => builder(table),
    rpc: (fn: string, args: unknown) => {
      calls.push({ table: `rpc:${fn}`, method: 'rpc', args: [args] });
      return builder(`rpc:${fn}`);
    },
  };
  /** Args of the first `method` call recorded on `table`. */
  const argsOf = (table: string, method: string): unknown[] | undefined =>
    calls.find((c) => c.table === table && c.method === method)?.args;
  return { db: db as unknown as Db, calls, argsOf };
}
