import { describe, expect, it } from 'vitest';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, setup } from './backup-run.fakes';
import { RESERVE_BYTES } from './quota';

// docs/45 §5.1: the shared Google account never fills: Drive's room is read before every part, and
// a «storage full» answer stops the run (it never just skips the object).

const GB = 1024 ** 3;

describe('Drive’s room during a run', () => {
  it('re-reads the quota before each part; a part that would eat the reserve stops the run', async () => {
    const t = await setup({ part: 25, run: 1000 });
    for (const k of ['a', 'b', 'c']) t.minio.set({ bucket: B.reports, key: k, body: 'x'.repeat(10) });
    const quota = t.drive.quota.bind(t.drive);
    let calls = 0;
    t.drive.quota = async () => {
      calls += 1;
      const q = await quota();
      return calls === 1 ? q : { ...q, usage: (q.limit ?? 0) - RESERVE_BYTES + 1 };
    };
    await expect(t.night('2026-11-07')).rejects.toThrow('drive_full');
    expect(calls).toBe(2);
    expect(t.drive.log.filter((m) => m === 'startUpload')).toHaveLength(1);
    expect(t.store.rows.map((r) => r.status)).toEqual(['done']);
  });

  it('storageQuotaExceeded on a big object’s own part stops the run (never «skip it»)', async () => {
    const t = await setup();
    t.minio.set({ bucket: B.reports, key: 'big.mp4', body: Buffer.alloc(65 * 1024 * 1024) });
    t.minio.set({ bucket: B.reports, key: 'z.pdf', body: 'z' });
    t.drive.failNext.set('putChunk', new GoogleApiError(403, 'storageQuotaExceeded'));
    await expect(t.night('2026-11-07')).rejects.toThrow('storageQuotaExceeded');
    expect(t.store.rows.map((r) => r.status)).toEqual(['failed']);
  });

  it('plenty of room: every part goes up', async () => {
    const t = await setup({ part: 25, run: 1000 });
    t.drive.quotaAnswer = { limit: 15 * GB, usage: GB, email: 'academy@example.test' };
    for (const k of ['a', 'b', 'c']) t.minio.set({ bucket: B.reports, key: k, body: 'x'.repeat(10) });
    expect(await t.night('2026-11-07')).toMatchObject({ parts: 2, sealed: true });
  });
});
