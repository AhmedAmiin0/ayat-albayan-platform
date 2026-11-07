import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, contents, fileNamed, fit, names, setup } from './backup-run.fakes';

// docs/45 §5: runs are resumable (per part) and one bad object never stops a run.

describe('resume after a crash mid-upload', () => {
  it('a failed part is retried next night; parts already uploaded are kept, not redone', async () => {
    const t = await setup({ part: fit(2), run: 1024 ** 3 });
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
    expect(names(t.drive, t.folderId)).toEqual(['full-2026-W45.tar.zst']);
    const sum = await t.night('2026-11-08');
    expect(sum).toMatchObject({ kind: 'full', label: '2026-W45', objects: 1, sealed: true });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'full-2026-W45.p3.tar.zst',
    ]);
  });

  it('a process killed mid-upload (row left uploading) counts as not covered', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a', body: 'a' });
    await t.night('2026-11-07');
    t.minio.set({ bucket: B.reports, key: 'b', body: 'b' });
    await t.store.start({
      folderId: t.folderId,
      kind: 'incr',
      label: '2026-11-08',
      part: 1,
      name: 'x',
    });
    const sum = await t.night('2026-11-08');
    // Abandoned, then removed with its file (none here) and trashed; its part number stays taken.
    expect(t.store.rows[1]).toMatchObject({ status: 'trashed', error: 'interrupted' });
    expect(sum).toMatchObject({ kind: 'incr', objects: 1 });
    expect(names(t.drive, t.folderId)).toContain('incr-2026-11-08.p2.tar.zst');
  });
});

describe('a bad object', () => {
  it('a vanished or unreadable object is skipped and reported; the rest is archived', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'ok.pdf', body: 'fine' });
    t.minio.set({ bucket: B.reports, key: 'gone.pdf', body: 'gone' });
    t.minio.set({ bucket: B.reports, key: 'bad.pdf', body: 'bad' });
    t.minio.vanish.add('reports/gone.pdf');
    t.minio.unreadable.add('reports/bad.pdf');
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ objects: 1, skipped: 2, unread: 1, sealed: false });
    const entries = await contents(
      t.drive,
      fileNamed(t.drive, t.folderId, 'full-2026-W45.tar.zst'),
    );
    const manifest = JSON.parse(entries.at(-1)?.text ?? '{}') as {
      skipped: { key: string; reason: string }[];
    };
    expect(manifest.skipped).toEqual([
      { bucket: 'reports', key: 'bad.pdf', reason: 'read_failed' },
      { bucket: 'reports', key: 'gone.pdf', reason: 'missing' },
    ]);
    t.minio.unreadable.clear();
    expect(await t.night('2026-11-08')).toMatchObject({
      kind: 'full',
      label: '2026-W45',
      objects: 1,
      sealed: true,
    });
  });

  it('a big streamed object that fails mid-read costs only its own part', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.minio.set({ bucket: B.reports, key: 'big.mp4', body: Buffer.alloc(65 * 1024 * 1024) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    t.minio.unreadable.add('reports/big.mp4');
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ parts: 2, objects: 2, skipped: 1, unread: 1, sealed: false });
    expect(t.store.rows.map((r) => r.status)).toEqual(['done', 'failed', 'done']);
  });
});
