import { describe, expect, it } from 'vitest';
import { B, setup } from './backup-run.fakes';

// Round 3, item 1: finish() committed but its answer was lost: the done part keeps its file.

describe('a write whose answer was lost', () => {
  it('finish() commits then rejects: the row stays done and its file is kept', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const finish = t.store.finish.bind(t.store);
    t.store.finish = async (input) => {
      await finish(input);
      throw new Error('502 after commit');
    };
    await expect(t.night('2026-11-07')).rejects.toThrow('502 after commit');
    const row = t.store.rows[0];
    expect(row?.status).toBe('done');
    expect(t.drive.files.has(row?.drive_file_id ?? '')).toBe(true);
    expect(t.drive.deleted).toEqual([]);
  });

  it('fail() and the re-read both fail: the file is left for the next night', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.store.finish = () => Promise.reject(new Error('db down'));
    t.store.fail = () => Promise.reject(new Error('db down'));
    t.store.status = () => Promise.reject(new Error('db down'));
    await expect(t.night('2026-11-07')).rejects.toThrow('db down');
    expect(t.drive.deleted).toEqual([]);
    expect(t.drive.live(t.folderId)).toHaveLength(1);
  });

  it('a part whose Drive file is gone is not sealed on: marked, sent again, then sealed', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const finish = t.store.finish.bind(t.store);
    t.store.finish = async (input) => {
      await finish(input);
      t.drive.files.delete(input.fileId); // the file vanished after the row was done
    };
    expect(await t.night('2026-11-07')).toMatchObject({ kind: 'full', sealed: false, trashed: 0 });
    expect(t.store.rows[0]?.status).toBe('trashed');
    expect(t.drive.log).not.toContain('remove');
    t.store.finish = finish;
    expect(await t.night('2026-11-08')).toMatchObject({ kind: 'full', objects: 1, sealed: true });
  });
});
