import { describe, expect, it } from 'vitest';
import { B, names, roomOf, setup } from './backup-run.fakes';

// docs/45 §5.1, verification items 2, 4, 6: the clean-up runs before any budget check, a lost
// file id is found by its row marker only, and a part number is never reused.

const MB = 1024 ** 2;

/** Night 1 uploads part 1, but its bookkeeping fails: a failed row that holds a Drive file. */
async function orphaned() {
  const t = await setup();
  let room = 50 * MB;
  roomOf(t.drive, () => room);
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: Buffer.alloc(MB, 3) });
  const finish = t.store.finish.bind(t.store);
  t.store.finish = () => Promise.reject(new Error('db down'));
  await expect(t.night('2026-11-06')).rejects.toThrow('db down');
  t.store.finish = finish;
  return { ...t, setRoom: (n: number) => (room = n) };
}

describe('the clean-up comes first', () => {
  it('under the reserve, an orphan file is still deleted (it may be the room needed)', async () => {
    const t = await orphaned();
    const file = t.store.rows[0]?.drive_file_id;
    t.setRoom(-MB); // under the reserve once the orphan is counted
    await expect(t.night('2026-11-08')).rejects.toThrow('drive_full');
    expect(t.drive.deleted).toEqual([file]);
  });

  it('orphan trashed, then drive_full before start(), then the next night: no reused part', async () => {
    const t = await orphaned();
    t.setRoom(0);
    await expect(t.night('2026-11-07')).rejects.toThrow('drive_full');
    t.setRoom(50 * MB);
    const sum = await t.night('2026-11-08'); // the same full (W45): part 1 stays taken
    expect(sum).toMatchObject({ kind: 'full', objects: 1, sealed: true });
    expect(names(t.drive, t.folderId)).toEqual(['full-2026-W45.p2.tar.zst']);
  });

  it('a failed row with no file id: its file is found by its ab_row marker, nothing else', async () => {
    const t = await setup();
    const row = { folderId: t.folderId, kind: 'full' as const, label: '2026-W45', name: 'x' };
    const id = await t.store.start({ ...row, part: 1 }); // the process dies after the upload
    const upload = async (rowId: string) => {
      const props = { ab_backup: 'minio', ab_row: rowId };
      const session = await t.drive.startUpload({
        name: 'x',
        parentId: t.folderId,
        appProperties: props,
      });
      return (await t.drive.putChunk({ session, offset: 0, bytes: Buffer.from('z'), total: 1 }))
        .fileId;
    };
    const lost = await upload(id);
    const other = await upload('not-a-failed-row');
    await t.night('2026-11-07');
    expect(t.drive.deleted).toEqual([lost]);
    expect(t.drive.files.has(other ?? '')).toBe(true);
    expect(t.store.rows[0]).toMatchObject({ status: 'trashed', error: 'interrupted' });
  });
});
