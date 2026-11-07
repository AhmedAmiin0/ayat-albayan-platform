import { describe, expect, it } from 'vitest';
import { B, contents, fileNamed, names, setup } from './backup-run.fakes';

// docs/45 §5 (add-only): every night uploads exactly the versions not recorded yet.

describe('the nightly add-only archive', () => {
  it('the first night holds every object, with a manifest and the marker', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 's1/l1.pdf', body: 'report one' });
    t.minio.set({ bucket: B.avatars, key: 'p/طالب تجربة.jpg', body: 'photo', type: 'image/jpeg' });
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ label: '2026-11-07', parts: 1, objects: 2, skipped: [] });
    expect(names(t.drive, t.folderId)).toEqual(['add-2026-11-07.p1.tar.zst']);
    const id = fileNamed(t.drive, t.folderId, 'add-2026-11-07.p1.tar.zst');
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
    expect(t.drive.files.get(id)?.meta.appProperties).toMatchObject({
      ab_backup: 'minio',
      label: '2026-11-07',
      part: '1',
    });
  });

  it('the next night holds exactly the new and the changed objects', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b1' });
    await t.night('2026-11-07');
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b2 changed' });
    t.minio.set({ bucket: B.receipts, key: 'r.png', body: 'receipt', type: 'image/png' });
    expect(await t.night('2026-11-08')).toMatchObject({ objects: 2 });
    const id = fileNamed(t.drive, t.folderId, 'add-2026-11-08.p1.tar.zst');
    expect((await contents(t.drive, id)).map((e) => `${e.path}=${e.text}`)).toEqual([
      'reports/b.pdf=b2 changed',
      'receipts/r.png=receipt',
      expect.stringMatching(/^manifest\.json=/),
    ]);
  });

  it('nothing new: no archive; a version once sent is never sent again', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    await t.night('2026-11-07');
    expect(await t.night('2026-11-08')).toMatchObject({ parts: 0 });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c1' });
    await t.night('2026-11-09');
    expect(names(t.drive, t.folderId)).toEqual([
      'add-2026-11-07.p1.tar.zst',
      'add-2026-11-09.p1.tar.zst',
    ]);
  });

  it('a second run the same night adds a part, never a duplicate name', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a1' });
    await t.night('2026-11-08');
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c1' });
    await t.night('2026-11-08');
    expect(names(t.drive, t.folderId)).toEqual([
      'add-2026-11-08.p1.tar.zst',
      'add-2026-11-08.p2.tar.zst',
    ]);
  });

  it('compresses: repetitive data shrinks', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'big.csv', body: 'سطر,1,2,3\n'.repeat(20_000) });
    const sum = await t.night('2026-11-07');
    expect(sum.compressedBytes).toBeLessThan(sum.rawBytes / 20);
  });
});
