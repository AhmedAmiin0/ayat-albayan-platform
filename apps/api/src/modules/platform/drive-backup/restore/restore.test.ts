import { describe, expect, it } from 'vitest';
import { B, setup } from '@/modules/platform/drive-backup/run/backup-run.fakes';
import { FakeMinio } from '@/modules/platform/drive-backup/source/backup-source.fakes';
import { restore } from './restore';

// docs/45 §5: the last full + the incrementals after it bring MinIO back to a day.

async function history() {
  const t = await setup();
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
  t.minio.set({ bucket: B.avatars, key: 'p/صورة.jpg', body: 'photo', type: 'image/jpeg' });
  await t.night('2026-11-07'); // full
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a2' });
  t.minio.set({ bucket: B.receipts, key: 'r.png', body: 'receipt', type: 'image/png' });
  await t.night('2026-11-08'); // incr
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a3' });
  await t.night('2026-11-09'); // incr
  return t;
}

describe('restore from Drive', () => {
  it('dry run (the default) lists the chain and writes nothing', async () => {
    const t = await history();
    const empty = new FakeMinio();
    const out = await restore({
      api: t.drive,
      source: empty,
      folderId: t.folderId,
      to: '2026-11-09',
      apply: false,
      overwrite: false,
    });
    expect(out.archives.map((a) => a.name)).toEqual([
      'incr-2026-11-09.tar.zst',
      'incr-2026-11-08.tar.zst',
      'full-2026-W45.tar.zst',
    ]);
    expect(empty.objects.size).toBe(0);
  });

  it('round trip: an emptied MinIO comes back with the newest copy of every key', async () => {
    const t = await history();
    const empty = new FakeMinio();
    const out = await restore({
      api: t.drive,
      source: empty,
      folderId: t.folderId,
      to: '2026-11-09',
      apply: true,
      overwrite: false,
    });
    expect(out).toMatchObject({ put: 3, kept: 0, older: 2, failed: [] });
    expect(empty.text('reports/a.pdf')).toBe('a3');
    expect(empty.objects.get('avatars/p/صورة.jpg')?.type).toBe('image/jpeg');
    expect(empty.objects.get('receipts/r.png')?.bytes.toString()).toBe('receipt');
    expect(empty.objects.get('reports/a.pdf')?.etag).toBe(
      t.minio.objects.get('reports/a.pdf')?.etag,
    );
  });

  it('to an earlier day: the versions of that day', async () => {
    const t = await history();
    const empty = new FakeMinio();
    await restore({
      api: t.drive,
      source: empty,
      folderId: t.folderId,
      to: '2026-11-08',
      apply: true,
      overwrite: false,
    });
    expect(empty.text('reports/a.pdf')).toBe('a2');
  });

  it('ifAbsent keeps what MinIO holds; --overwrite replaces it', async () => {
    const t = await history();
    const live = new FakeMinio();
    live.set({ bucket: B.reports, key: 'a.pdf', body: 'newer, kept' });
    const kept = await restore({
      api: t.drive,
      source: live,
      folderId: t.folderId,
      to: '2026-11-09',
      apply: true,
      overwrite: false,
    });
    expect(kept).toMatchObject({ put: 2, kept: 1 });
    expect(live.text('reports/a.pdf')).toBe('newer, kept');
    await restore({
      api: t.drive,
      source: live,
      folderId: t.folderId,
      to: '2026-11-09',
      apply: true,
      overwrite: true,
    });
    expect(live.text('reports/a.pdf')).toBe('a3');
  });

  it('before the first full: refuses (no_full_backup)', async () => {
    const t = await history();
    const input = {
      api: t.drive,
      source: new FakeMinio(),
      folderId: t.folderId,
      apply: false,
      overwrite: false,
    };
    await expect(restore({ ...input, to: '2026-11-06' })).rejects.toThrow('no_full_backup');
  });

  it('a damaged archive fails (zstd checksum), never restores bad bytes', async () => {
    const t = await history();
    const full = [...t.drive.files.values()].find((f) => f.meta.name === 'full-2026-W45.tar.zst');
    full?.bytes.fill(7, 20, 40);
    const input = {
      api: t.drive,
      source: new FakeMinio(),
      folderId: t.folderId,
      apply: true,
      overwrite: false,
    };
    await expect(restore({ ...input, to: '2026-11-07' })).rejects.toThrow();
  });
});
