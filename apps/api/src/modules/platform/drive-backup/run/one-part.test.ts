import { describe, expect, it } from 'vitest';
import { B, setup } from './backup-run.fakes';
import { runBackup } from './backup-run';

// A created Drive file's id is never lost, a row taken over by another run is never written as
// this run's, a failed start() leaves nothing behind, and no file is ever deleted (add-only).

const NOW = new Date('2026-11-07T01:00:00Z');

describe('a part that fails after its file exists', () => {
  it('aborted during the last chunk: the file id is kept on the failed row, the file kept', async () => {
    const t = await setup();
    const stop = new AbortController();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const put = t.drive.putChunk.bind(t.drive);
    t.drive.putChunk = async (input) => {
      const r = await put(input);
      if (r.fileId) stop.abort(new Error('run_deadline')); // the deadline, as the file lands
      return r;
    };
    const deps = { ...t.deps, signal: stop.signal };
    await expect(runBackup(deps, { folderId: t.folderId, now: NOW })).rejects.toThrow();
    const row = t.store.rows[0];
    expect(row?.status).toBe('failed');
    expect(t.drive.files.has(row?.drive_file_id ?? '')).toBe(true);
    t.drive.putChunk = put;
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 1 });
    expect(t.drive.files.has(row?.drive_file_id ?? '')).toBe(true);
  });

  it('a row abandoned by another run: no write as this run’s; its file is left alone', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const put = t.drive.putChunk.bind(t.drive);
    t.drive.putChunk = async (input) => {
      await t.store.abandon(t.folderId); // a second run starts meanwhile
      return put(input);
    };
    await expect(t.night('2026-11-07')).rejects.toThrow('not uploading');
    expect(t.store.rows[0]).toMatchObject({ status: 'failed', error: 'interrupted' });
    expect(t.drive.live(t.folderId)).toHaveLength(1);
  });

  it('start() fails (a duplicate part): the error goes on, no row and no upload', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.store.start = () => Promise.reject(new Error('duplicate part'));
    await expect(t.night('2026-11-07')).rejects.toThrow('duplicate part');
    expect(t.drive.log).not.toContain('startUpload');
  });

  it('the file carries its row id (ab_row)', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    await t.night('2026-11-07');
    const row = t.store.rows[0];
    const file = t.drive.files.get(row?.drive_file_id ?? '');
    expect(file?.meta.appProperties).toMatchObject({ ab_backup: 'minio', ab_row: row?.id });
  });
});
