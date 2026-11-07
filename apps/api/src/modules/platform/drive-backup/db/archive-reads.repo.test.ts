import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ArchiveReadsRepo } from './archive-reads.repo';

// Round 3, item 1: a row's status is read again when a write's answer was lost.

function dbAnswering(data: unknown) {
  const calls: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq']) {
    chain[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return chain;
    };
  }
  chain.maybeSingle = () => Promise.resolve({ data, error: null });
  return { db: chain as unknown as Db, calls };
}

describe('ArchiveReadsRepo.status', () => {
  it('the row’s status, parsed', async () => {
    const t = dbAnswering({ status: 'done' });
    expect(await new ArchiveReadsRepo(t.db).status('a')).toBe('done');
    expect(t.calls).toContain('eq("id","a")');
  });

  it('no such row: null; an unknown status is refused', async () => {
    expect(await new ArchiveReadsRepo(dbAnswering(null).db).status('a')).toBeNull();
    await expect(
      new ArchiveReadsRepo(dbAnswering({ status: 'odd' }).db).status('a'),
    ).rejects.toThrow();
  });
});
