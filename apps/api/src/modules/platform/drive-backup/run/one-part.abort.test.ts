import { describe, expect, it } from 'vitest';
import { STREAMED_MIN } from '@/modules/platform/drive-backup/plan/parts';
import { GoogleApiError } from '@/modules/platform/google-sync';
import { B, setup } from './backup-run.fakes';
import { partOrSkip } from './one-part';

// Round 3, item 4: the job's deadline during one big object's own part stops the night (with the
// deadline as its error); any other failure of such a part only skips that object.

async function solo(failWith: (stop: AbortController) => Error) {
  const t = await setup();
  const etag = t.minio.set({ bucket: B.recordings, key: 'r.mp4', body: 'r' });
  const stop = new AbortController();
  t.drive.putChunk = () => Promise.reject(failWith(stop));
  const ctx = {
    deps: { ...t.deps, signal: stop.signal },
    folderId: t.folderId,
    now: new Date('2026-11-07T01:00:00Z'),
  };
  const plan = { label: '2026-11-07', part: 1 };
  const big = [{ bucket: B.recordings, key: 'r.mp4', etag, size: STREAMED_MIN + 1 }];
  return { t, run: () => partOrSkip(ctx, plan, big) };
}

describe('one big object’s own part', () => {
  it('aborted by the deadline: rethrown as the deadline, the row failed with it', async () => {
    const { t, run } = await solo((stop) => {
      stop.abort(new Error('run_deadline'));
      return new Error('stream destroyed');
    });
    await expect(run()).rejects.toThrow('run_deadline');
    expect(t.store.rows[0]).toMatchObject({ status: 'failed', error: 'run_deadline' });
  });

  it('any other failure: that object is skipped as upload_failed, the night goes on', async () => {
    const { t, run } = await solo(() => new GoogleApiError(400, 'badRequest'));
    await expect(run()).resolves.toEqual({ done: null, why: 'upload_failed' });
    expect(t.store.rows[0]?.status).toBe('failed');
  });
});
