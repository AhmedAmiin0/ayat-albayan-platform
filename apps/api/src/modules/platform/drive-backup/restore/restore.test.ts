import { describe, expect, it } from 'vitest';
import { B, setup } from '@/modules/platform/drive-backup/run/backup-run.fakes';
import { FakeMinio } from '@/modules/platform/drive-backup/source/backup-source.fakes';
import { restore } from './restore';

// docs/45 §5: every add-only archive, newest first: the newest copy of each key wins.

async function history() {
  const t = await setup();
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
  t.minio.set({ bucket: B.avatars, key: 'p/صورة.jpg', body: 'photo', type: 'image/jpeg' });
  await t.night('2026-11-07');
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a2' });
  t.minio.set({ bucket: B.receipts, key: 'r.png', body: 'receipt', type: 'image/png' });
  await t.night('2026-11-08');
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a3' });
  await t.night('2026-11-09');
  return t;
}

const run = (t: Awaited<ReturnType<typeof history>>, opts: { to: string; target: FakeMinio }) =>
  restore({
    api: t.drive,
    source: opts.target,
    folderId: t.folderId,
    to: opts.to,
    apply: true,
    overwrite: false,
  });

describe('restore from Drive', () => {
  it('dry run (the default) lists every archive, newest first, and writes nothing', async () => {
    const t = await history();
    const empty = new FakeMinio();
    const input = { api: t.drive, source: empty, folderId: t.folderId, overwrite: false };
    const out = await restore({ ...input, to: '2026-11-09', apply: false });
    expect(out.archives.map((a) => a.name)).toEqual([
      'add-2026-11-09.p1.tar.zst',
      'add-2026-11-08.p1.tar.zst',
      'add-2026-11-07.p1.tar.zst',
    ]);
    expect(empty.objects.size).toBe(0);
  });

  it('round trip: an emptied MinIO comes back with the newest copy of every key', async () => {
    const t = await history();
    const empty = new FakeMinio();
    expect(await run(t, { to: '2026-11-09', target: empty })).toMatchObject({
      put: 3,
      kept: 0,
      older: 2,
      failed: [],
    });
    expect(empty.text('reports/a.pdf')).toBe('a3');
    expect(empty.objects.get('avatars/p/صورة.jpg')?.type).toBe('image/jpeg');
    expect(empty.objects.get('receipts/r.png')?.bytes.toString()).toBe('receipt');
  });

  it('to an earlier day: the versions of that day', async () => {
    const t = await history();
    const empty = new FakeMinio();
    await run(t, { to: '2026-11-08', target: empty });
    expect(empty.text('reports/a.pdf')).toBe('a2');
  });

  it('duplicates (an orphan part and its retry) restore once, the newest copy winning', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    const finish = t.store.finish.bind(t.store);
    t.store.finish = () => Promise.reject(new Error('db down'));
    await expect(t.night('2026-11-07')).rejects.toThrow('db down');
    t.store.finish = finish;
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a2' });
    await t.night('2026-11-08');
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b' });
    await t.night('2026-11-08');
    expect(t.drive.live(t.folderId)).toHaveLength(3);
    const empty = new FakeMinio();
    expect(await run(t, { to: '2026-11-08', target: empty })).toMatchObject({ put: 2, older: 1 });
    expect(empty.text('reports/a.pdf')).toBe('a2');
  });

  it('keeps what MinIO holds; --overwrite replaces it', async () => {
    const t = await history();
    const live = new FakeMinio();
    live.set({ bucket: B.reports, key: 'a.pdf', body: 'newer, kept' });
    expect(await run(t, { to: '2026-11-09', target: live })).toMatchObject({ put: 2, kept: 1 });
    expect(live.text('reports/a.pdf')).toBe('newer, kept');
    const input = { api: t.drive, source: live, folderId: t.folderId, apply: true };
    await restore({ ...input, to: '2026-11-09', overwrite: true });
    expect(live.text('reports/a.pdf')).toBe('a3');
  });

  it('before the first archive: nothing to apply', async () => {
    const t = await history();
    const out = await run(t, { to: '2026-11-06', target: new FakeMinio() });
    expect(out).toMatchObject({ archives: [], put: 0 });
  });

  it('a damaged archive fails (zstd checksum), never restores bad bytes', async () => {
    const t = await history();
    const first = [...t.drive.files.values()].find((f) => f.meta.name.includes('11-07'));
    first?.bytes.fill(7, 20, 40);
    await expect(run(t, { to: '2026-11-07', target: new FakeMinio() })).rejects.toThrow();
  });
});
