import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { BUCKETS } from '@/common/storage/storage.paths';
import { STREAMED_MIN } from '@/modules/platform/drive-backup/plan/parts';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';
import { emptyReport, partBytes } from './part-stream';

// Round 3, item 5: a MinIO body (a real Node stream) is destroyed when it is dropped unread.

function sourceOf(body: Readable, opened: { size: number; etag: string }): BackupSource {
  const object = { ...opened, contentType: 'video/mp4', body };
  return {
    list: () => Readable.from([]),
    open: () => Promise.resolve(object),
    restore: () => Promise.resolve('put'),
  };
}
const inputOf = (source: BackupSource, size: number) => ({
  source,
  objects: [{ bucket: BUCKETS.recordings, key: 'r.mp4', etag: 'e', size }],
  report: emptyReport(),
  meta: {},
  now: new Date('2026-11-07T01:00:00Z'),
});

describe('dropped MinIO bodies are destroyed', () => {
  it('changed since the listing: the unread body is destroyed', async () => {
    const body = Readable.from([Buffer.from('new bytes')]);
    const input = inputOf(sourceOf(body, { size: 9, etag: 'new' }), 9);
    for await (const c of partBytes(input)) expect(c).toBeDefined();
    expect(input.report.skipped).toEqual([
      { bucket: 'recordings', key: 'r.mp4', reason: 'changed' },
    ]);
    expect(body.destroyed).toBe(true);
  });

  it('a streamed body opened but never started (the pipeline stopped): destroyed', async () => {
    const size = STREAMED_MIN + 1;
    const body = Readable.from([Buffer.alloc(16)]);
    const parts = partBytes(inputOf(sourceOf(body, { size, etag: 'e' }), size));
    const first = await parts.next(); // the entry's header only: the body is not read yet
    expect(first.done).toBe(false);
    await parts.return(undefined);
    expect(body.destroyed).toBe(true);
  });
});
