// In-memory TargetDb for engine tests: inserts return '<table>-<n>', a throwing transaction rolls
// its writes back, select() answers through a handler keyed on the query text.
import type { Param } from '../db/sql.ts';
import type { ImportItemWrite, TargetDb, TargetTx } from '../db/target.ts';

interface FakeDbOptions {
  /** Rows for db.select by query text; findByColumn asks for 'find <table>.<column>'. */
  select?: (text: string, params: readonly Param[]) => object[];
  /** Insert into this table throws. */
  failOn?: string;
}

interface FakeDb {
  db: TargetDb;
  log: string[];
  items: ImportItemWrite[];
  runs: { ok: boolean; error?: string }[];
  /** Committed transactions. */
  commits: number[];
}

/** Runs `read` inside a promise, so a throw rejects like the real async driver's would. */
const settle = <T>(read: () => T): Promise<T> => new Promise((resolve) => resolve(read()));

function fakeTx(o: FakeDbOptions, w: Pick<FakeDb, 'log' | 'items'>): TargetTx {
  let n = 0;
  return {
    insert: (s) =>
      settle(() => {
        if (s.table === o.failOn) throw new Error('boom');
        w.log.push(`insert ${s.table} ${JSON.stringify(s.columns)}`);
        return s.returning === null ? null : `${s.table}-${++n}`;
      }),
    update: (s) =>
      settle(() => {
        w.log.push(`update ${s.table} ${s.id} ${JSON.stringify(s.columns)}`);
      }),
    recordItem: (i) =>
      settle(() => {
        w.items.push(i);
      }),
    exec: (q) =>
      settle(() => {
        w.log.push(`exec ${q.text}`);
      }),
  };
}

export function fakeDb(o: FakeDbOptions = {}): FakeDb {
  const log: string[] = [];
  const items: ImportItemWrite[] = [];
  const runs: FakeDb['runs'] = [];
  const commits: number[] = [];
  const tx = fakeTx(o, { log, items });
  const rows = (text: string, params: readonly Param[]) => o.select?.(text, params) ?? [];
  const db: TargetDb = {
    name: 'local',
    loadImportItems: () => settle(() => new Map()),
    findByColumn: (q) =>
      settle(() => {
        const found = rows(`find ${q.table}.${q.column}`, [q.values]) as {
          id: string;
          value: string;
        }[];
        const hits = found.filter((r) => q.values.includes(r.value));
        return new Map(hits.map((r) => [r.value, r.id]));
      }),
    lockApply: () => settle(() => undefined),
    startRun: () => settle(() => 'run-1'),
    finishRun: (r) =>
      settle(() => {
        runs.push({ ok: r.ok, error: r.error });
      }),
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
    select: <T extends object>(q: { text: string; params: Param[] }) =>
      settle(() => rows(q.text, q.params) as T[]),
    close: () => settle(() => undefined),
  };
  return { db, log, items, runs, commits };
}
