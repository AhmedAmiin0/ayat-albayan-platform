import { describe, expect, it } from 'vitest';
import { fakeMoveDb, id, moveStores, RECEIPTS } from './move.fakes';
import { moveColumns, type MoveJob } from './run';

const KEYS = ['s/1.pdf', 's/2.pdf', 's/3.pdf', 's/4.pdf', 's/5.pdf'];

async function job(extra: Partial<MoveJob> = {}) {
  const rows = Object.fromEntries(KEYS.map((k, i) => [id(i + 1), k]));
  const fake = fakeMoveDb({ ...rows, [id(9)]: 'minio:s/9.pdf', [id(10)]: null });
  const s = await moveStores(KEYS);
  const base: MoveJob = {
    db: fake.db,
    stores: s.stores,
    columns: [RECEIPTS],
    limit: 100,
    batch: 2,
    pauseMs: 0,
    sleep: () => Promise.resolve(),
    ...extra,
  };
  return { ...fake, ...s, job: base };
}

describe('moveColumns: --apply (docs/45 §6)', () => {
  it('moves every unmarked row in id order, batches of 2, one audit row per batch', async () => {
    const { job: j, table, audits } = await job();
    const out = await moveColumns(j);
    const want = { copied: 5, rewritten: 5, skipped: 1, missing: 0, failed: 0 };
    expect(out.totals).toMatchObject(want);
    expect(out.columns[0]?.cursor).toBe(id(5));
    expect([...table.values()].filter((p) => p?.startsWith('minio:'))).toHaveLength(6);
    expect(audits.map((a) => a.rewritten.length)).toEqual([2, 2, 1]);
    expect(audits[0]?.rewritten[0]).toEqual({ id: id(1), path: 's/1.pdf' });
  });

  it('is idempotent: a second run finds nothing to do', async () => {
    const { job: j } = await job();
    await moveColumns(j);
    const again = await moveColumns(j);
    expect(again.totals).toMatchObject({ copied: 0, rewritten: 0, skipped: 6 });
  });

  it('--limit stops early; the cursor resumes where it stopped', async () => {
    const { job: j, table } = await job({ limit: 3 });
    const first = await moveColumns(j);
    expect(first.totals.rewritten).toBe(3);
    expect(table.get(id(4))).toBe('s/4.pdf');
    const cursor = first.columns[0]?.cursor ?? '';
    const rest = await moveColumns({ ...j, limit: 100, after: cursor });
    expect(rest.totals.rewritten).toBe(2);
    expect(rest.columns[0]?.cursor).toBe(id(5));
  });

  it('resuming after a cursor never revisits earlier rows (a missing object stays reported once)', async () => {
    const { job: j, from } = await job();
    await from.store.remove({ bucket: 'receipts', keys: ['s/1.pdf'] });
    const first = await moveColumns(j);
    expect(first.totals).toMatchObject({ missing: 1, rewritten: 4 });
    const resumed = await moveColumns({ ...j, after: id(1) });
    expect(resumed.totals).toMatchObject({ missing: 0, rewritten: 0 });
    const fromStart = await moveColumns(j);
    expect(fromStart.totals).toMatchObject({ missing: 1, rewritten: 0 });
  });

  it('pauses between batches (the VPS is shared)', async () => {
    const naps: number[] = [];
    const { job: j } = await job({ pauseMs: 250 });
    await moveColumns({ ...j, sleep: (ms) => Promise.resolve(void naps.push(ms)) });
    expect(naps).toEqual([250, 250, 250]);
  });
});

describe('moveColumns: stopping early (docs/45 §6)', () => {
  it('a failing guard (driver switched back) stops before the next batch, with the counts so far', async () => {
    let calls = 0;
    const guard = (): Promise<void> => {
      calls += 1;
      return calls > 1 ? Promise.reject(new Error('STORAGE_DRIVER is not minio')) : Promise.resolve();
    };
    const { job: j, table } = await job({ guard });
    const out = await moveColumns(j);
    expect(out.error).toBe('STORAGE_DRIVER is not minio');
    expect(out.totals.rewritten).toBe(2);
    expect(out.columns[0]?.cursor).toBe(id(2));
    expect(table.get(id(3))).toBe('s/3.pdf');
  });

  it('a database error mid-run still reports the cursor to resume from', async () => {
    const { job: j, db } = await job();
    const page = db.page.bind(db);
    db.page = (input) =>
      input.after === id(4) ? Promise.reject(new Error('timeout')) : page(input);
    const out = await moveColumns(j);
    expect(out).toMatchObject({ error: 'timeout', totals: { rewritten: 4 } });
    expect(out.columns[0]?.cursor).toBe(id(4));
  });
});
