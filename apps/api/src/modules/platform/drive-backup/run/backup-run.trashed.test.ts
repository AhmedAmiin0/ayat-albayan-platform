import { describe, expect, it } from 'vitest';
import { B, setup } from './backup-run.fakes';

// Round 4, item 2: a done part a person moved to Drive's trash is never deleted for good at seal
// time (it may still be restored from the trash); only retention deletes such a file.

const FRIDAYS = ['2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04', '2026-12-11'];

describe('a done part in Drive’s trash', () => {
  it('at seal: its row is marked trashed, the file is not deleted, the full stays open', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    const finish = t.store.finish.bind(t.store);
    t.store.finish = async (input) => {
      await finish(input);
      const f = t.drive.files.get(input.fileId);
      if (f) f.trashed = true; // a person moved it to Drive's trash
    };
    const first = await t.night('2026-11-07');
    expect(first).toMatchObject({ kind: 'full', sealed: false, trashed: 0 });
    const id = t.store.rows[0]?.drive_file_id ?? '';
    expect(t.store.rows[0]?.status).toBe('trashed');
    expect(t.drive.files.get(id)?.trashed).toBe(true);
    expect(t.drive.deleted).toEqual([]);
    t.store.finish = finish;
    expect(await t.night('2026-11-08')).toMatchObject({ kind: 'full', objects: 1, sealed: true });
    expect(t.drive.files.has(id)).toBe(true);
  });

  it('retention still deletes a sealed full a person trashed (it frees the quota)', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    for (const d of FRIDAYS.slice(0, 4)) await t.night(d);
    const oldest = t.store.rows[0]?.drive_file_id ?? '';
    const f = t.drive.files.get(oldest);
    if (f) f.trashed = true;
    const sum = await t.night(FRIDAYS[4] ?? '');
    expect(sum).toMatchObject({ sealed: true });
    expect(t.drive.deleted).toContain(oldest);
  });
});
