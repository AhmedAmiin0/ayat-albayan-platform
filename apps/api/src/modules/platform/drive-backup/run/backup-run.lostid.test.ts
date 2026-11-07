import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, setup } from './backup-run.fakes';

// Round 3, item 3: Drive made the file, the answer with its id was lost (an abort, a network
// failure whose progress() check failed too): the row is failed with no id, and later nights
// look for the file by its row marker until it is found (or a week has passed).

async function lostId() {
  const t = await setup();
  t.minio.set({ bucket: B.reports, key: 'a.pdf', body: 'a' });
  const put = t.drive.putChunk.bind(t.drive);
  t.drive.putChunk = async (input) => {
    await put(input); // the file is made...
    throw new GoogleApiError(0, 'network'); // ...and the answer is lost
  };
  t.drive.progress = () => Promise.reject(new GoogleApiError(0, 'network'));
  await expect(t.night('2026-11-07')).rejects.toThrow();
  t.drive.putChunk = put;
  return t;
}

describe('a Drive file whose id was lost', () => {
  it('the row is failed with no id; the next night finds the file by marker and deletes it', async () => {
    const t = await lostId();
    const lost = t.drive.live(t.folderId).map((f) => f.meta.id);
    expect(t.store.rows[0]).toMatchObject({ status: 'failed', drive_file_id: null });
    expect(lost).toHaveLength(1);
    await t.night('2026-11-08');
    expect(t.drive.deleted).toEqual(lost);
    expect(t.store.rows[0]?.status).toBe('trashed');
  });

  it('not found yet (search lag): the row is kept and searched again the night after', async () => {
    const t = await lostId();
    const find = t.drive.findMarked.bind(t.drive);
    t.drive.findMarked = () => Promise.resolve([]);
    await t.night('2026-11-08');
    expect(t.store.rows[0]?.status).toBe('failed');
    t.drive.findMarked = find;
    await t.night('2026-11-09');
    expect(t.store.rows[0]?.status).toBe('trashed');
    expect(t.drive.deleted).toHaveLength(1);
  });

  it('nothing found for a week: the row is retired', async () => {
    const t = await lostId();
    t.drive.findMarked = () => Promise.resolve([]);
    await t.night('2026-11-10');
    expect(t.store.rows[0]?.status).toBe('failed');
    await t.night('2026-11-15');
    expect(t.store.rows[0]?.status).toBe('trashed');
  });
});
