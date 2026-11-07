import { z } from 'zod';
import { BLOCK, checksum } from './tar';
import { ByteReader } from './byte-reader';

// Reads what tar.ts writes (the restore, docs/45 §5): pax records, then file entries whose bytes
// stream out; anything else (directories, links) is skipped. A bad checksum or a cut-off stream
// throws: a damaged archive is never half-trusted.

export interface TarEntry {
  path: string;
  size: number;
  records: Readonly<Record<string, string>>;
  /** Read it (or not) before asking for the next entry: the rest is skipped. */
  body: AsyncIterable<Buffer>;
}

const fieldText = (h: Buffer, at: number, len: number): string =>
  h
    .subarray(at, at + len)
    .toString('ascii')
    .replace(/\0.*$/s, '')
    .trim();

const octalField = (h: Buffer, at: number, len: number): number =>
  Number.parseInt(fieldText(h, at, len) || '0', 8);

const paxSchema = z.record(z.string(), z.string());

/** «<length> <key>=<value>\n» records → a map. */
function parsePax(bytes: Buffer): Record<string, string> {
  const pairs: [string, string][] = [];
  for (let at = 0; at < bytes.length;) {
    const space = bytes.indexOf(0x20, at);
    const len = Number(bytes.subarray(at, space).toString('ascii'));
    if (space < 0 || !(len > 0)) throw new Error('tar_corrupt');
    const record = bytes.subarray(space + 1, at + len - 1).toString('utf8');
    const eq = record.indexOf('=');
    pairs.push([record.slice(0, eq), record.slice(eq + 1)]);
    at += len;
  }
  return paxSchema.parse(Object.fromEntries(pairs));
}

const isEnd = (h: Buffer): boolean => h.every((b) => b === 0);

function checked(h: Buffer): Buffer {
  if (checksum(h) !== octalField(h, 148, 8)) throw new Error('tar_corrupt');
  return h;
}

async function* bodyOf(r: ByteReader, left: { n: number }): AsyncGenerator<Buffer> {
  while (left.n > 0) {
    const chunk = await r.some(Math.min(left.n, 1 << 20));
    left.n -= chunk.length;
    yield chunk;
  }
}

/** An entry's data not read yet (`left`), its full size (for the padding), its body if a file. */
interface Pending {
  size: number;
  left: { n: number };
  body: AsyncGenerator<Buffer> | null;
}
interface State {
  records: Record<string, string>;
  pending: Pending;
}
const NOTHING: Pending = { size: 0, left: { n: 0 }, body: null };
const pad = (size: number): number => (BLOCK - (size % BLOCK)) % BLOCK;

/**
 * Closes the entry's body first (an async generator's return() waits behind a read still in
 * flight, e.g. a failed PUT that stopped consuming mid-chunk), so no read of it can interleave
 * with what follows; then skips what was left unread, then the padding to the next block.
 */
async function settle(r: ByteReader, s: State): Promise<void> {
  const p = s.pending;
  s.pending = NOTHING;
  await p.body?.return(undefined);
  await r.skip(p.left.n);
  p.left.n = 0;
  await r.take(pad(p.size));
}

type Step = (r: ByteReader, h: Buffer, s: State) => Promise<TarEntry | null>;

const paxStep: Step = async (r, h, s) => {
  const size = octalField(h, 124, 12);
  s.records = parsePax((await r.take(size)) ?? Buffer.alloc(0));
  await r.take(pad(size));
  return null;
};

/** A file: its bytes stream out through `body`; the next settle() skips what is left. */
const fileStep: Step = (r, h, s) => {
  const size = Number(s.records.size ?? octalField(h, 124, 12));
  const path = s.records.path ?? fieldText(h, 0, 100);
  const records = s.records;
  s.records = {};
  const left = { n: size };
  const body = bodyOf(r, left);
  s.pending = { size, left, body };
  return Promise.resolve({ path, size, records, body });
};

/** Directories, links, …: their data (if any) is skipped. */
const skipStep: Step = (r, h, s) => {
  const size = octalField(h, 124, 12);
  s.records = {};
  s.pending = { size, left: { n: size }, body: null };
  return Promise.resolve(null);
};

const STEPS: Readonly<Record<string, Step>> = { x: paxStep, '0': fileStep, '': fileStep };

/** null at the end blocks; a stream that stops before them is a cut-off archive. */
async function header(r: ByteReader): Promise<Buffer | null> {
  const h = await r.take(BLOCK);
  if (h === null) throw new Error('tar_truncated');
  return isEnd(h) ? null : checked(h);
}

/** The archive's file entries, in order. */
export async function* readTar(source: AsyncIterable<Uint8Array>): AsyncGenerator<TarEntry> {
  const r = new ByteReader(source);
  const s: State = { records: {}, pending: NOTHING };
  for (let h = await header(r); h !== null; h = await header(r)) {
    const entry = await (STEPS[fieldText(h, 156, 1)] ?? skipStep)(r, h, s);
    if (entry) yield entry;
    await settle(r, s);
  }
}
