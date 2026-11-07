import { describe, expect, it } from 'vitest';
import { B, setup } from './backup-run.fakes';

// A write whose answer was lost: the file stays on Drive (add-only), and only recorded objects
// count as backed up.

describe('a write whose answer was lost', () => {
  it('finish() commits then rejects: the objects count as backed up, the file stays', async () => {
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
    t.store.finish = finish;
    expect(await t.night('2026-11-08')).toMatchObject({ parts: 0 });
  });

  it('finish() and fail() both fail: the file stays; the objects go again next night', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const finish = t.store.finish.bind(t.store);
    const fail = t.store.fail.bind(t.store);
    t.store.finish = () => Promise.reject(new Error('db down'));
    t.store.fail = () => Promise.reject(new Error('db down'));
    await expect(t.night('2026-11-07')).rejects.toThrow('db down');
    expect(t.drive.live(t.folderId)).toHaveLength(1);
    Object.assign(t.store, { finish, fail });
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 1 });
    expect(t.store.rows[0]).toMatchObject({ status: 'failed', error: 'interrupted' });
    expect(t.drive.live(t.folderId)).toHaveLength(2);
  });
});
