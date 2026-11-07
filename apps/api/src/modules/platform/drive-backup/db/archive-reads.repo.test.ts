import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ArchiveReadsRepo } from './archive-reads.repo';

// The next part number of a night counts failed rows too: a retry never reuses a part's name.

function dbAnswering(data: unknown) {
  const calls: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'select', 'eq', 'order', 'limit']) {
    chain[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return chain;
    };
  }
  chain.maybeSingle = () => Promise.resolve({ data, error: null });
  return { db: chain as unknown as Db, calls };
}

describe('ArchiveReadsRepo.lastPart', () => {
  it('the night’s highest part, over every status', async () => {
    const t = dbAnswering({ part: 3 });
    const repo = new ArchiveReadsRepo(t.db);
    expect(await repo.lastPart({ folderId: 'f', label: '2026-11-07' })).toBe(3);
    expect(t.calls).toContain('eq("label","2026-11-07")');
    expect(t.calls.join()).not.toContain('status');
  });

  it('no part yet: 0', async () => {
    const repo = new ArchiveReadsRepo(dbAnswering(null).db);
    expect(await repo.lastPart({ folderId: 'f', label: '2026-11-07' })).toBe(0);
  });
});
