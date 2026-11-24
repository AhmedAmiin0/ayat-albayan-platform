// Membership is decided in code, so a page reads batches; cursors never skip or repeat rows.

interface Dated {
  starts_at: string;
}

export interface PageSource<T extends Dated, U extends Dated> {
  /** One batch: rows that started before `before`, newest first, at most `batch` of them. */
  read: (before: string) => Promise<T[]>;
  /** The kept form of a row; [] = not in this list. */
  pick: (row: T) => U[];
}

interface PageSize {
  page: number;
  batch: number;
  /** Reads per request at most; past it the page returns short with a cursor to go on from. */
  maxBatches: number;
}

export interface CollectedPage<U> {
  rows: U[];
  next_cursor: string | null;
}

interface Step<U> {
  kept: U[];
  before: string;
  reads: number;
}

/** Newest first from `start` (exclusive); next_cursor null once the rows run out. */
export function collectPage<T extends Dated, U extends Dated>(
  source: PageSource<T, U>,
  start: string,
  size: PageSize,
): Promise<CollectedPage<U>> {
  return step(source, size, { kept: [], before: start, reads: 0 });
}

async function step<T extends Dated, U extends Dated>(
  source: PageSource<T, U>,
  size: PageSize,
  at: Step<U>,
): Promise<CollectedPage<U>> {
  if (at.reads >= size.maxBatches) return { rows: at.kept, next_cursor: at.before };
  const batch = await source.read(at.before);
  const kept = [...at.kept, ...batch.flatMap(source.pick)];
  if (kept.length >= size.page) return full(kept, size.page);
  const last = batch.at(-1);
  if (batch.length < size.batch || last === undefined) return { rows: kept, next_cursor: null };
  return step(source, size, { kept, before: last.starts_at, reads: at.reads + 1 });
}

/** A full page ends at its own last row: the next page starts right after it. */
function full<U extends Dated>(kept: readonly U[], page: number): CollectedPage<U> {
  const rows = kept.slice(0, page);
  return { rows, next_cursor: rows.at(-1)?.starts_at ?? null };
}
