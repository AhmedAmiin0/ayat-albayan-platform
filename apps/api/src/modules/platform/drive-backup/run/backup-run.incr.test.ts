import { describe, expect, it } from 'vitest';
import { B, contents, fileNamed, names, setup } from './backup-run.fakes';

// docs/45 §5: the first night is a full; later nights upload only what is new or changed (ETag).

describe('nightly incremental archive', () => {
  it('the first night is a sealed full of every object, with a manifest', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 's1/l1.pdf', body: 'report one' });
    t.minio.set({ bucket: B.avatars, key: 'p/طالب تجربة.jpg', body: 'photo', type: 'image/jpeg' });
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ kind: 'full', label: '2026-W45', objects: 2, sealed: true });
    expect(names(t.drive, t.folderId)).toEqual(['full-2026-W45.tar.zst']);
    const id = fileNamed(t.drive, t.folderId, 'full-2026-W45.tar.zst');
    const entries = await contents(t.drive, id);
    expect(entries.map((e) => e.path)).toEqual([
      'reports/s1/l1.pdf',
      'avatars/p/طالب تجربة.jpg',
      'manifest.json',
    ]);
    expect(entries[1]?.records).toMatchObject({
      'AB.contenttype': 'image/jpeg',
      'AB.key': 'p/طالب تجربة.jpg',
    });
    expect(entries[0]?.text).toBe('report one');
    const manifest = JSON.parse(entries[2]?.text ?? '{}') as {
      entries: { key: string; etag: string }[];
    };
    expect(manifest.entries.map((e) => e.key)).toEqual(['s1/l1.pdf', 'p/طالب تجربة.jpg']);
    expect(t.drive.files.get(id)?.meta.appProperties).toMatchObject({
      kind: 'full',
      sealed: '1',
      day: '2026-11-07',
    });
  });

  it('the next night holds exactly the new and the changed objects', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b1' });
    await t.night('2026-11-07');
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b2 changed' });
    t.minio.set({ bucket: B.receipts, key: 'r.png', body: 'receipt', type: 'image/png' });
    const sum = await t.night('2026-11-08');
    expect(sum).toMatchObject({ kind: 'incr', label: '2026-11-08', objects: 2, sealed: false });
    const entries = await contents(
      t.drive,
      fileNamed(t.drive, t.folderId, 'incr-2026-11-08.tar.zst'),
    );
    expect(entries.map((e) => `${e.path}=${e.text}`)).toEqual([
      'reports/b.pdf=b2 changed',
      'receipts/r.png=receipt',
      expect.stringMatching(/^manifest\.json=/),
    ]);
  });

  it('nothing new: no archive, and a later night still compares against the whole chain', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    await t.night('2026-11-07');
    expect(await t.night('2026-11-08')).toMatchObject({ kind: 'incr', parts: 0 });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c1' });
    await t.night('2026-11-09');
    t.minio.set({ bucket: B.reports, key: 'd.pdf', body: 'd1' });
    expect(await t.night('2026-11-10')).toMatchObject({ objects: 1 });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'incr-2026-11-09.tar.zst',
      'incr-2026-11-10.tar.zst',
    ]);
  });

  it('a second run the same night adds a part, never a duplicate name', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    await t.night('2026-11-07');
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b1' });
    await t.night('2026-11-08');
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c1' });
    await t.night('2026-11-08');
    expect(names(t.drive, t.folderId)).toContain('incr-2026-11-08.p2.tar.zst');
  });

  it('compresses: repetitive data shrinks', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'big.csv', body: 'سطر,1,2,3\n'.repeat(20_000) });
    const sum = await t.night('2026-11-07');
    expect(sum.compressedBytes).toBeLessThan(sum.rawBytes / 20);
  });
});
