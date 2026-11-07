import { describe, expect, it } from 'vitest';
import type { BackupSource } from '@/modules/platform/drive-backup/source/backup-source.port';
import { emptyReport, partBytes } from './part-stream';

// A small object is read into one buffer of exactly its size (1x in memory): a body longer or
// shorter than the size MinIO announced is a failed read, skipped and reported.

async function* bytes(n: number) {
  yield Buffer.alloc(Math.ceil(n / 2), 1);
  yield Buffer.alloc(Math.floor(n / 2), 2);
}

const sourceOf = (announced: number, real: number): BackupSource => ({
  list: () => bytes(0) as never,
  open: () =>
    Promise.resolve({ size: announced, etag: 'e', contentType: 'text/plain', body: bytes(real) }),
  restore: () => Promise.resolve('put'),
});

async function run(announced: number, real: number) {
  const report = emptyReport();
  const objects = [{ bucket: 'reports' as const, key: 'k', etag: 'e', size: announced }];
  const input = { source: sourceOf(announced, real), objects, report, meta: {}, now: new Date() };
  let total = 0;
  for await (const c of partBytes(input)) total += c.length;
  return { report, total };
}

describe('partBytes: a small object read whole', () => {
  it('exactly the announced size: archived', async () => {
    const { report } = await run(10, 10);
    expect(report.entries.map((e) => e.size)).toEqual([10]);
    expect(report.skipped).toEqual([]);
  });

  it.each([
    [10, 12],
    [10, 7],
  ])('announced %i, read %i: skipped as read_failed', async (announced, real) => {
    const { report } = await run(announced, real);
    expect(report.entries).toEqual([]);
    expect(report.skipped).toEqual([{ bucket: 'reports', key: 'k', reason: 'read_failed' }]);
  });
});
