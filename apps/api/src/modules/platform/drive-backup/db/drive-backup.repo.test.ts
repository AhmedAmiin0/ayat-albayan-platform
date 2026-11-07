import { describe, expect, it } from 'vitest';
import type { Db } from '@/common/db/db.module';
import { ArchiveObjectsRepo } from './archive-objects.repo';
import { DriveBackupRepo } from './drive-backup.repo';

// Verification item 7: uploaded / finish / fail write only a row still `uploading` (this run's);
// zero rows changed is an error. A chainable stand-in for the query builder records the filters.

function dbAnswering(rows: { id: string }[]) {
  const calls: string[] = [];
  const chain: Record<string, unknown> = {};
  for (const m of ['from', 'update', 'eq', 'select']) {
    chain[m] = (...args: unknown[]) => {
      calls.push(`${m}(${args.map((a) => JSON.stringify(a)).join(',')})`);
      return chain;
    };
  }
  chain.then = (ok: (v: unknown) => unknown) =>
    Promise.resolve({ data: rows, error: null }).then(ok);
  return { db: chain as unknown as Db, calls };
}

describe('DriveBackupRepo: this run’s rows only', () => {
  it('filters on status = uploading', async () => {
    const t = dbAnswering([{ id: 'a' }]);
    await new DriveBackupRepo(t.db, new ArchiveObjectsRepo(t.db)).uploaded({
      id: 'a',
      fileId: 'f',
    });
    expect(t.calls).toContain('eq("status","uploading")');
    expect(t.calls).toContain('eq("id","a")');
  });

  it('zero rows changed (another run abandoned it) is an error, never a silent success', async () => {
    const t = dbAnswering([]);
    const repo = new DriveBackupRepo(t.db, new ArchiveObjectsRepo(t.db));
    await expect(repo.uploaded({ id: 'a', fileId: 'f' })).rejects.toThrow('not uploading');
    await expect(repo.fail({ id: 'a', error: 'x', fileId: 'f' })).rejects.toThrow('not uploading');
  });
});
