import { Readable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { readTar } from './tar-read';
import { entryHead, padding, paxRecord, TAR_END } from './tar';

function archive(
  files: { path: string; body: Buffer; records?: Record<string, string> }[],
): Buffer {
  const parts = files.flatMap((f) => [
    entryHead({
      path: f.path,
      size: f.body.length,
      mtime: 1_700_000_000,
      records: f.records ?? {},
    }),
    f.body,
    padding(f.body.length),
  ]);
  return Buffer.concat([...parts, TAR_END]);
}

async function read(bytes: Buffer, chunk = 100) {
  const pieces = Array.from({ length: Math.ceil(bytes.length / chunk) }, (_, i) =>
    bytes.subarray(i * chunk, (i + 1) * chunk),
  );
  const out: { path: string; text: string; records: Readonly<Record<string, string>> }[] = [];
  for await (const e of readTar(Readable.from(pieces))) {
    const got: Buffer[] = [];
    for await (const c of e.body) got.push(c);
    out.push({ path: e.path, text: Buffer.concat(got).toString('utf8'), records: e.records });
  }
  return out;
}

describe('tar (pax) writer and reader', () => {
  it('pax records count their own length', () => {
    expect(paxRecord('path', 'a')).toBe('9 path=a\n');
    expect(paxRecord('k', 'x'.repeat(3))).toBe('8 k=xxx\n');
    const long = paxRecord('path', 'x'.repeat(95));
    expect(Buffer.byteLength(long)).toBe(Number(long.split(' ')[0]));
  });

  it('round trip: long Arabic keys, empty and block-sized files, records', async () => {
    const longKey = `reports/${'ملف-'.repeat(40)}.pdf`;
    const files = [
      { path: longKey, body: Buffer.from('تقرير الحلقة'), records: { 'AB.etag': 'abc' } },
      { path: 'avatars/empty.jpg', body: Buffer.alloc(0) },
      { path: 'receipts/block.png', body: Buffer.alloc(512, 1) },
    ];
    const out = await read(archive(files), 37);
    expect(out.map((e) => e.path)).toEqual(files.map((f) => f.path));
    expect(out[0]?.text).toBe('تقرير الحلقة');
    expect(out[0]?.records['AB.etag']).toBe('abc');
    expect(out[2]?.text.length).toBe(512);
  });

  it('a body left unread is skipped', async () => {
    const bytes = archive([
      { path: 'a', body: Buffer.alloc(2000, 2) },
      { path: 'b', body: Buffer.from('b') },
    ]);
    const paths: string[] = [];
    for await (const e of readTar(Readable.from([bytes]))) paths.push(e.path);
    expect(paths).toEqual(['a', 'b']);
  });

  it('a damaged header or a cut-off archive throws', async () => {
    const bytes = archive([{ path: 'a', body: Buffer.from('a') }]);
    const bad = Buffer.from(bytes);
    bad[0] = 0x41;
    await expect(read(bad)).rejects.toThrow('tar_corrupt');
    await expect(read(bytes.subarray(0, 1600))).rejects.toThrow('tar_truncated');
  });
});
