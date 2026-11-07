import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, roomOf, setup } from './backup-run.fakes';

// Owner 2026-11-07: the backup is ADD-ONLY. Whatever happens (failed parts, lost answers, crashes,
// Drive almost full), it never deletes, trashes or changes a file on Drive: files only grow.

/** Every Drive call the backup may make: reads, the folder, and uploads. */
const ALLOWED = new Set(['quota', 'folder', 'findFolders', 'createFolder', 'list']);
['startUpload', 'putChunk', 'progress', 'download'].forEach((m) => ALLOWED.add(m));

describe('add-only: nothing on Drive is ever deleted', () => {
  it('across failing, lost and short nights the files only grow', async () => {
    const t = await setup();
    const counts: number[] = [];
    const seen = () => counts.push(t.drive.files.size);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    const finish = t.store.finish.bind(t.store);
    t.store.finish = () => Promise.reject(new Error('502 after upload')); // an orphan stays
    await expect(t.night('2026-11-07')).rejects.toThrow('502');
    seen();
    t.store.finish = finish;
    t.drive.failNext.set('putChunk', new GoogleApiError(400, 'badRequest'));
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b' });
    await expect(t.night('2026-11-08')).rejects.toThrow('badRequest');
    seen();
    await t.night('2026-11-09');
    seen();
    roomOf(t.drive, () => 0);
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    expect(await t.night('2026-11-10')).toMatchObject({ waiting: 1 });
    seen();
    expect(counts).toEqual([2, 2, 3, 3]); // the folder, the orphan, then the retry
    expect(t.drive.log.filter((m) => !ALLOWED.has(m))).toEqual([]);
    expect(t.store.rows.map((r) => r.status)).toEqual(['failed', 'failed', 'done']);
  });
});
