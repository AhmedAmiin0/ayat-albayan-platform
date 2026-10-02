// In-memory TargetDb for engine tests: inserts return '<table>-<n>', a throwing transaction rolls
// its writes back, select() answers through a handler keyed on the query text.
import type { Param } from '../db/sql.ts';
import type { ImportItemWrite, TargetDb, TargetTx } from '../db/target.ts';

export interface FakeDbOptions {
  /** Rows for db.select by query text; findByColumn asks for 'find <table>.<column>'. */
  select?: (text: string, params: readonly Param[]) => object[];
  /** Insert into this table throws. */
  failOn?: string;
}

export interface FakeDb {
  db: TargetDb;
  log: string[];
  items: ImportItemWrite[];
  runs: { ok: boolean; error?: string }[];
  /** Committed transactions. */
  commits: number[];
}

export function fakeDb(o: FakeDbOptions = {}): FakeDb {
  const log: string[] = [];
  const items: ImportItemWrite[] = [];
  const runs: FakeDb['runs'] = [];
  const commits: number[] = [];
  let n = 0;
  const tx: TargetTx = {
    insert: async (s) => {
      if (s.table === o.failOn) throw new Error('boom');
      log.push(`insert ${s.table} ${JSON.stringify(s.columns)}`);
      return s.returning === null ? null : `${s.table}-${++n}`;
    },
    update: async (s) => void log.push(`update ${s.table} ${s.id} ${JSON.stringify(s.columns)}`),
    recordItem: async (i) => void items.push(i),
    exec: async (q) => void log.push(`exec ${q.text}`),
  };
  const rows = (text: string, params: readonly Param[]) => o.select?.(text, params) ?? [];
  const db: TargetDb = {
    name: 'local',
    loadImportItems: async () => new Map(),
    findByColumn: async (q) => {
      const found = rows(`find ${q.table}.${q.column}`, [q.values]) as {
        id: string;
        value: string;
      }[];
      return new Map(found.filter((r) => q.values.includes(r.value)).map((r) => [r.value, r.id]));
    },
    lockApply: async () => undefined,
    startRun: async () => 'run-1',
    finishRun: async (r) => void runs.push({ ok: r.ok, error: r.error }),
    transaction: async (fn) => {
      const mark = { log: log.length, items: items.length };
      try {
        const out = await fn(tx);
        commits.push(items.length - mark.items);
        return out;
      } catch (err) {
        log.length = mark.log;
        items.length = mark.items;
        throw err;
      }
    },
    select: async <T extends object>(q: { text: string; params: Param[] }) =>
      rows(q.text, q.params) as T[],
    close: async () => undefined,
  };
  return { db, log, items, runs, commits };
}
