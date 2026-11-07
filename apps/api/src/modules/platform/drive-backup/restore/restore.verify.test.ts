import { createHash, randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { B, setup } from '@/modules/platform/drive-backup/run/backup-run.fakes';
import { FakeMinio } from '@/modules/platform/drive-backup/source/backup-source.fakes';
import { restore } from './restore';
import { verified } from './verified';

// docs/45 §5.1: bad bytes are never restored, and a late zstd checksum error is never swallowed.

const md5 = (b: Buffer) => createHash('md5').update(b).digest('hex');
const drain = async (body: AsyncIterable<Buffer>) => {
  let n = 0;
  for await (const c of body) n += c.length;
  expect(n).toBeGreaterThan(0);
};

describe('verified (per-entry MD5 against the recorded ETag)', () => {
  const bytes = Buffer.from('hello world');
  const body = () => Readable.from([bytes.subarray(0, 5), bytes.subarray(5)]);

  it('passes matching bytes, fails a mismatch, lets a multipart ETag through', async () => {
    await expect(drain(verified(body(), md5(bytes)))).resolves.toBeUndefined();
    await expect(drain(verified(body(), md5(Buffer.from('other'))))).rejects.toThrow(
      'etag_mismatch',
    );
    await expect(drain(verified(body(), `${md5(bytes)}-2`))).resolves.toBeUndefined();
  });

  it('holds the last chunk back until the digest matched', async () => {
    const seen: number[] = [];
    const it = verified(body(), md5(Buffer.from('other')));
    await expect(
      (async () => {
        for await (const c of it) seen.push(c.length);
      })(),
    ).rejects.toThrow('etag_mismatch');
    expect(seen).toEqual([5]);
  });
});

describe('restore of an archive damaged in the middle (incompressible data)', () => {
  it('the damaged object is never put; the late zstd checksum fails the restore', async () => {
    const t = await setup();
    // zstd stores incompressible data as raw blocks: damage there passes decompression and is
    // only caught by the frame's checksum, after the next object, at the archive's end.
    t.minio.set({ bucket: B.reports, key: 'a-noise.bin', body: randomBytes(256 * 1024) });
    t.minio.set({ bucket: B.reports, key: 'z-noise.bin', body: randomBytes(256 * 1024) });
    await t.night('2026-11-07');
    const full = [...t.drive.files.values()].find(
      (f) => f.meta.name === 'add-2026-11-07.p1.tar.zst',
    );
    const at = Math.floor((full?.bytes.length ?? 0) / 4);
    full?.bytes.fill(0x55, at, at + 64);
    const target = new FakeMinio();
    const input = { api: t.drive, source: target, folderId: t.folderId, overwrite: false };
    await expect(restore({ ...input, to: '2026-11-07', apply: true })).rejects.toThrow('checksum');
    expect(target.objects.has('reports/a-noise.bin')).toBe(false);
  });
});
