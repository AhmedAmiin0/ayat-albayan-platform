import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { B, names, roomOf, setup } from './backup-run.fakes';

// docs/45 §5.1, verification item 3: Drive never has to hold KEEP_FULLS + 1 fulls. A full the
// room cannot finish retires the oldest sealed full early, keeping one sealed full and its chain.

const MB = 1024 ** 2;
const FRIDAYS = ['2026-11-13', '2026-11-20', '2026-11-27', '2026-12-04'];

describe('early retirement for an open full', () => {
  it('the oldest sealed full goes when the 5th does not fit; the 5th is sealed', async () => {
    const t = await setup();
    roomOf(t.drive, () => 14 * MB); // 4 fulls of ~3 MB fit, a 5th does not
    t.minio.set({ bucket: B.reports, key: 'data.bin', body: randomBytes(3 * MB) });
    for (const d of FRIDAYS) await t.night(d);
    expect(names(t.drive, t.folderId)).toHaveLength(4);
    const sum = await t.night('2026-12-11');
    expect(sum).toMatchObject({ kind: 'full', label: '2026-W50', sealed: true, trashed: 1 });
    expect(names(t.drive, t.folderId)).toEqual([
      'full-2026-W47.tar.zst',
      'full-2026-W48.tar.zst',
      'full-2026-W49.tar.zst',
      'full-2026-W50.tar.zst',
    ]);
  });

  it('never the last sealed full: with one left, the night is drive_full instead', async () => {
    const t = await setup();
    let room = 5 * MB;
    roomOf(t.drive, () => room);
    t.minio.set({ bucket: B.reports, key: 'data.bin', body: randomBytes(3 * MB) });
    await t.night('2026-11-13');
    room = 3.5 * MB; // the next full cannot fit beside the only sealed one
    await expect(t.night('2026-11-20')).rejects.toThrow('drive_full');
    expect(t.drive.deleted).toEqual([]);
    expect(names(t.drive, t.folderId)).toEqual(['full-2026-W46.tar.zst']);
  });
});
