import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { versionId } from '@/modules/platform/drive-backup/plan/parts';
import { ArchiveObjectsRepo } from './archive-objects.repo';

const T = 'drive_backup_objects';
const object = (i: number) => ({ bucket: 'b', key: `k${i}`, etag: 'e' });

describe('ArchiveObjectsRepo.covered', () => {
  it('reads page after page of 1000 until a short one', async () => {
    const full = Array.from({ length: 1000 }, (_, i) => object(i));
    const t = fakeDb({ [T]: [{ data: full }, { data: [object(1000)] }] });
    const covered = await new ArchiveObjectsRepo(t.db).covered('f1');
    expect(covered.size).toBe(1001);
    expect(t.trips).toEqual([T, T]);
    expect(t.calls.filter((c) => c.method === 'range').map((c) => c.args)).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
  });

  it('stops after one read when the first page is short', async () => {
    const t = fakeDb({ [T]: [{ data: [object(1), object(1)] }] });
    expect(await new ArchiveObjectsRepo(t.db).covered('f1')).toEqual(new Set([versionId(object(1))]));
    expect(t.trips).toEqual([T]);
  });

  it('keeps the drive backup error text when a page fails', async () => {
    const t = fakeDb({ [T]: [{ error: { message: 'boom' } }] });
    await expect(new ArchiveObjectsRepo(t.db).covered('f1')).rejects.toThrow(
      'drive backup objects read failed: boom',
    );
  });
});
