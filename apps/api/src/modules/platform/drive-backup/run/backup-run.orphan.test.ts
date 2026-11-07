import { describe, expect, it } from 'vitest';
import { B, names, setup } from './backup-run.fakes';

// docs/45 §5.1: an archive that reached Drive but whose bookkeeping failed never leaks quota.

describe('an uploaded part whose bookkeeping failed', () => {
  it('keeps its Drive file id on the failed row; the next run deletes that file', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const finish = t.store.finish.bind(t.store);
    t.store.finish = () => Promise.reject(new Error('db down'));
    await expect(t.night('2026-11-07')).rejects.toThrow('db down');
    const orphan = t.store.rows[0];
    expect(orphan).toMatchObject({ status: 'failed' });
    expect(orphan?.drive_file_id).toBeTruthy();
    t.store.finish = finish;
    const sum = await t.night('2026-11-08');
    expect(t.drive.deleted).toEqual([orphan?.drive_file_id]);
    expect(orphan?.status).toBe('trashed');
    expect(sum).toMatchObject({ kind: 'full', objects: 1, trashed: 1, sealed: true });
    expect(names(t.drive, t.folderId)).toEqual(['full-2026-W45.p2.tar.zst']);
  });

  it('a file id that is not the backup’s own archive is never deleted', async () => {
    const t = await setup();
    const other = await t.drive.createFolder('someone else');
    const outcome = await t.drive.remove({ fileId: other, folderId: t.folderId });
    expect(outcome).toBe('foreign');
    expect(t.drive.files.has(other)).toBe(true);
  });
});
