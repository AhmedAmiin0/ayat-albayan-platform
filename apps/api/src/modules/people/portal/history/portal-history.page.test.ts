import { describe, expect, it, vi } from 'vitest';
import { collectPage, type CollectedPage, type PageSource } from './portal-history.page';

interface Row {
  starts_at: string;
  keep: boolean;
}

/** n rows, one hour apart, newest first; `keep(i)` decides membership. */
const at = (i: number): string => new Date(Date.UTC(2026, 9, 30) - i * 3_600_000).toISOString();
const table = (n: number, keep: (i: number) => boolean): Row[] =>
  Array.from({ length: n }, (_, i) => ({ starts_at: at(i), keep: keep(i) }));

/** A keyset reader over `rows` (strictly before the cursor, newest first, `batch` at most). */
function source(rows: Row[], batch: number) {
  const read = vi.fn(async (before: string) =>
    rows.filter((r) => r.starts_at < before).slice(0, batch),
  );
  const src: PageSource<Row, Row> = { read, pick: (r: Row) => (r.keep ? [r] : []) };
  return { ...src, read };
}

const START = '2026-11-01T00:00:00.000Z';
const SIZE = { page: 3, batch: 4, maxBatches: 5 };

/** Every kept row, walking the pages until next_cursor is null. */
async function walk(rows: Row[], size = SIZE): Promise<string[]> {
  const seen: string[] = [];
  let cursor: string | null = START;
  for (let guard = 0; cursor !== null && guard < 50; guard += 1) {
    const page: CollectedPage<Row> = await collectPage(source(rows, size.batch), cursor, size);
    seen.push(...page.rows.map((r) => r.starts_at));
    cursor = page.next_cursor;
  }
  return seen;
}

describe('collectPage (filtered keyset page)', () => {
  it('a full page ends at its own last row; the rest of the batch is read again next time', async () => {
    const rows = table(10, () => true);
    const page = await collectPage(source(rows, 4), START, SIZE);
    expect(page.rows.map((r) => r.starts_at)).toEqual([at(0), at(1), at(2)]);
    expect(page.next_cursor).toBe(at(2));
  });

  it('reads more batches when the filter drops rows, and ends with null when they run out', async () => {
    const rows = table(10, (i) => i % 3 === 0);
    const src = source(rows, 4);
    const page = await collectPage(src, START, { ...SIZE, page: 10 });
    expect(page.rows.map((r) => r.starts_at)).toEqual([at(0), at(3), at(6), at(9)]);
    expect(page.next_cursor).toBeNull();
    expect(src.read.mock.calls.map(([before]) => before)).toEqual([START, at(3), at(7)]);
  });

  it('stops after maxBatches with a cursor at the last scanned row (a short page, not the end)', async () => {
    const rows = table(30, (i) => i === 25);
    const page = await collectPage(source(rows, 4), START, { ...SIZE, maxBatches: 2 });
    expect(page).toEqual({ rows: [], next_cursor: at(7) });
  });

  it('walking every page loses and repeats nothing', async () => {
    const keeps = [() => true, (i: number) => i % 2 === 0, (i: number) => i % 5 === 1, () => false];
    for (const keep of keeps) {
      const rows = table(23, keep);
      const want = rows.filter((r) => r.keep).map((r) => r.starts_at);
      expect(await walk(rows)).toEqual(want);
      expect(await walk(rows, { page: 2, batch: 3, maxBatches: 1 })).toEqual(want);
    }
  });

  it('an empty list is one empty page', async () => {
    expect(await collectPage(source([], 4), START, SIZE)).toEqual({ rows: [], next_cursor: null });
  });
});
