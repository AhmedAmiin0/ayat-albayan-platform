import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, contents, fileNamed, fit, names, setup } from './backup-run.fakes';

// docs/45 §5: a failed part is simply retried next night; a bad object is named and retried.

describe('resume after a failure', () => {
  it('a failed part is retried next night; parts already uploaded are not redone', async () => {
    const t = await setup({ part: fit(2) });
    for (const k of ['a', 'b', 'c'])
      t.minio.set({ bucket: B.reports, key: k, body: 'x'.repeat(10) });
    let puts = 0;
    const put = t.drive.putChunk.bind(t.drive);
    t.drive.putChunk = (input) => {
      puts += 1;
      if (puts === 2) throw new GoogleApiError(400, 'badRequest'); // the 2nd part's upload
      return put(input);
    };
    await expect(t.night('2026-11-07')).rejects.toThrow('google 400 badRequest');
    expect(t.store.rows.map((r) => r.status)).toEqual(['done', 'failed']);
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 1 });
    expect(names(t.drive, t.folderId)).toEqual([
      'add-2026-11-07.p1.tar.zst',
      'add-2026-11-08.p1.tar.zst',
    ]);
  });

  it('a process killed mid-upload (row left uploading): failed, its part number stays taken', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'b', body: 'b' });
    const row = { folderId: t.folderId, label: '2026-11-08', part: 1, name: 'x' };
    await t.store.start(row);
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 1 });
    expect(t.store.rows[0]).toMatchObject({ status: 'failed', error: 'interrupted' });
    expect(names(t.drive, t.folderId)).toEqual(['add-2026-11-08.p2.tar.zst']);
  });
});

describe('a bad object', () => {
  it('unreadable: skipped and named; a vanished one is not; retried next night', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'ok.pdf', body: 'fine' });
    t.minio.set({ bucket: B.reports, key: 'gone.pdf', body: 'gone' });
    t.minio.set({ bucket: B.reports, key: 'bad.pdf', body: 'bad' });
    t.minio.vanish.add('reports/gone.pdf');
    t.minio.unreadable.add('reports/bad.pdf');
    const sum = await t.night('2026-11-07');
    expect(sum.objects).toBe(1);
    expect(sum.skipped).toEqual([{ id: 'reports/bad.pdf', size: 3, reason: 'read_failed' }]);
    const id = fileNamed(t.drive, t.folderId, 'add-2026-11-07.p1.tar.zst');
    const manifest = JSON.parse((await contents(t.drive, id)).at(-1)?.text ?? '{}') as {
      skipped: { key: string; reason: string }[];
    };
    expect(manifest.skipped.map((s) => `${s.key}:${s.reason}`)).toEqual([
      'bad.pdf:read_failed',
      'gone.pdf:missing',
    ]);
    t.minio.unreadable.clear();
    t.minio.vanish.clear();
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 2, skipped: [] });
  });

  it('a big streamed object that fails mid-read is named; the others still go', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.minio.set({ bucket: B.reports, key: 'big.mp4', body: Buffer.alloc(65 * 1024 * 1024) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    t.minio.unreadable.add('reports/big.mp4');
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ parts: 2, objects: 2 });
    expect(sum.skipped).toEqual([
      { id: 'reports/big.mp4', size: 65 * 1024 * 1024, reason: 'read_failed' },
    ]);
    expect(t.store.rows.map((r) => r.status)).toEqual(['done', 'failed', 'done']);
  });

  it('a big object whose own upload Drive refuses is named upload_failed (not MinIO)', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'big.mp4', body: Buffer.alloc(65 * 1024 * 1024) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    t.drive.failNext.set('putChunk', new GoogleApiError(400, 'badRequest'));
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ parts: 1, objects: 1 });
    expect(sum.skipped).toEqual([
      { id: 'reports/big.mp4', size: 65 * 1024 * 1024, reason: 'upload_failed' },
    ]);
  });
});
