import { describe, expect, it } from 'vitest';
import { readTar } from './tar-read';
import { entryHead, padding, TAR_END } from './tar';

// A consumer that gives up mid-entry (a failed PUT during the restore) must not break the framing:
// the next entry still starts at its own header.

const file = (path: string, body: Buffer) => [
  entryHead({ path, size: body.length, mtime: 1_700_000_000, records: {} }),
  body,
  padding(body.length),
];

/** Small pieces, each after a macrotask: reads really are in flight when the consumer moves on. */
async function* slow(bytes: Buffer, chunk: number) {
  for (let at = 0; at < bytes.length; at += chunk) {
    await new Promise((resolve) => setImmediate(resolve));
    yield bytes.subarray(at, at + chunk);
  }
}

const tarOf = () =>
  Buffer.concat([
    ...file('a.bin', Buffer.alloc(5000, 0x41)),
    ...file('b.txt', Buffer.from('second')),
    TAR_END,
  ]);

async function text(body: AsyncIterable<Buffer>): Promise<string> {
  const got: Buffer[] = [];
  for await (const c of body) got.push(c);
  return Buffer.concat(got).toString('utf8');
}

describe('readTar when a consumer stops mid-entry', () => {
  it('a read left in flight is waited for, then the rest skipped: the next entry is intact', async () => {
    const seen: string[] = [];
    for await (const e of readTar(slow(tarOf(), 64))) {
      const it = e.body[Symbol.asyncIterator]();
      if (e.path === 'a.bin') {
        await it.next();
        void it.next(); // the PUT failed while this read was still pending
        continue;
      }
      seen.push(`${e.path}:${await text({ [Symbol.asyncIterator]: () => it })}`);
    }
    expect(seen).toEqual(['b.txt:second']);
  });

  it('a body never read at all is skipped whole', async () => {
    const seen: string[] = [];
    for await (const e of readTar(slow(tarOf(), 700))) {
      if (e.path === 'b.txt') seen.push(await text(e.body));
    }
    expect(seen).toEqual(['second']);
  });
});
