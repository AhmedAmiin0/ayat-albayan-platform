import { describe, expect, it } from 'vitest';
import { B, names, roomOf, setup } from './backup-run.fakes';

// docs/45 §5.1, verification item 1: one object larger than the night's room never blocks the
// objects after it; it is named every night and does not keep a full from sealing (round 4).

const MB = 1024 ** 2;

describe('an object larger than tonight’s room', () => {
  it('is skipped and named; later objects still go; the full seals without it', async () => {
    const t = await setup();
    let room = 3 * MB;
    roomOf(t.drive, () => room);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    t.minio.set({ bucket: B.reports, key: 'big.pdf', body: Buffer.alloc(4 * MB, 7) });
    t.minio.set({ bucket: B.reports, key: 'c.pdf', body: 'c' });
    const first = await t.night('2026-11-07');
    expect(first).toMatchObject({ kind: 'full', objects: 2, sealed: true });
    expect(first.tooLarge).toEqual([{ id: 'reports/big.pdf', size: 4 * MB, why: 'room' }]);
    room = 50 * MB;
    const next = await t.night('2026-11-08');
    expect(next).toMatchObject({ kind: 'incr', objects: 1, tooLarge: [] });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W45.tar.zst',
      'incr-2026-11-08.tar.zst',
    ]);
  });

  it('no room for any part at all: the run stops (drive_full), nothing is sent', async () => {
    const t = await setup();
    roomOf(t.drive, () => MB / 2);
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
    await expect(t.night('2026-11-07')).rejects.toThrow('drive_full');
    expect(t.drive.log).not.toContain('startUpload');
  });

  it('a part that no longer fits waits while a later one fits; none fits: drive_full', async () => {
    const t = await setup({ part: 3 * MB, run: 1024 ** 3 });
    let calls = 0;
    roomOf(t.drive, () => (calls++ === 1 ? 2 * MB : 20 * MB)); // shrinks before the first part
    t.minio.set({ bucket: B.reports, key: 'a.pdf', body: Buffer.alloc(2 * MB, 1) });
    t.minio.set({ bucket: B.reports, key: 'b.pdf', body: 'b' });
    const sum = await t.night('2026-11-07');
    expect(sum).toMatchObject({ objects: 1, left: ['reports/a.pdf'], sealed: false });
  });
});
