import { setTimeout as sleep } from 'node:timers/promises';
import { classify } from '@/modules/platform/google-sync';
import type { ChunkResult, DriveBackupApi, UploadTarget } from './drive-backup.port';

/** 8 MiB: a multiple of 256 KiB (Drive's rule for every chunk but the last); the memory held. */
export const CHUNK_BYTES = 8 * 1024 * 1024;
const ATTEMPTS = 5;
const baseDelayMs = 2_000;

export interface UploadInput {
  api: DriveBackupApi;
  target: UploadTarget;
  source: AsyncIterable<Uint8Array>;
  /** Tests: no real waiting. */
  wait?: (ms: number) => Promise<unknown>;
  chunkBytes?: number;
}

/** Exactly `size`-byte buffers (the last one shorter), holding at most one of them. */
export async function* rechunk(source: AsyncIterable<Uint8Array>, size: number) {
  let held: Buffer[] = [];
  let n = 0;
  for await (const piece of source) {
    held.push(Buffer.from(piece));
    n += piece.length;
    for (; n >= size; n -= size) {
      const all = Buffer.concat(held);
      yield all.subarray(0, size);
      held = [all.subarray(size)];
    }
  }
  if (n > 0) yield Buffer.concat(held);
}

interface Send {
  api: DriveBackupApi;
  session: string;
  wait: (ms: number) => Promise<unknown>;
}

interface Chunk {
  offset: number;
  bytes: Buffer;
  total: number | null;
}
type Try = { result: ChunkResult } | { result: null; at: number };

/** One attempt from `at`; a 429 / 5xx / network failure waits, then asks Drive what it holds. */
async function attempt(s: Send, c: Chunk & { at: number; n: number }): Promise<Try> {
  try {
    const bytes = c.bytes.subarray(c.at - c.offset);
    const input = { session: s.session, offset: c.at, bytes, total: c.total };
    return { result: await s.api.putChunk(input) };
  } catch (e) {
    if (c.n >= ATTEMPTS || classify(e) !== 'retry') throw e;
    await s.wait(baseDelayMs * 2 ** (c.n - 1));
    return { result: null, at: await resumeAt(s, c.offset) };
  }
}

/** One chunk, resent from what Drive already holds after a failure (backoff, 5 attempts). */
async function sendChunk(s: Send, chunk: Chunk): Promise<ChunkResult> {
  let at = chunk.offset;
  for (let n = 1; ; n += 1) {
    const r = await attempt(s, { ...chunk, at, n });
    if (r.result) return r.result;
    at = r.at;
  }
}

/** Where to resend from; the chunk is resent whole when Drive cannot say. */
async function resumeAt(s: Send, offset: number): Promise<number> {
  const unknown: ChunkResult = { committed: offset, fileId: null };
  const p = await s.api.progress(s.session).catch(() => unknown);
  return Math.max(offset, p.committed);
}

/** Each item with whether it is the last (one item of lookahead). */
async function* withLast<T>(source: AsyncIterable<T>): AsyncGenerator<{ item: T; last: boolean }> {
  let held: { item: T } | null = null;
  for await (const item of source) {
    if (held) yield { item: held.item, last: false };
    held = { item };
  }
  if (held) yield { item: held.item, last: true };
}

/**
 * Streams `source` into one Drive file through a resumable session: never more than one chunk in
 * memory, nothing on disk. Returns the file id and the bytes uploaded (the compressed size).
 */
export async function uploadStream(input: UploadInput): Promise<{ fileId: string; bytes: number }> {
  const session = await input.api.startUpload(input.target);
  const s: Send = { api: input.api, session, wait: input.wait ?? ((ms) => sleep(ms)) };
  let offset = 0;
  let fileId: string | null = null;
  for await (const { item, last } of withLast(
    rechunk(input.source, input.chunkBytes ?? CHUNK_BYTES),
  )) {
    const total = last ? offset + item.length : null;
    fileId = (await sendChunk(s, { offset, bytes: item, total })).fileId;
    offset += item.length;
  }
  if (!fileId) throw new Error('drive_upload_incomplete');
  return { fileId, bytes: offset };
}
