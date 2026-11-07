import { setTimeout as sleep } from 'node:timers/promises';
import { classify, GoogleApiError } from '@/modules/platform/google-sync';
import type { ChunkResult, DriveBackupApi, UploadTarget } from './drive-backup.port';

/** 8 MiB: a multiple of 256 KiB (Drive's rule for every chunk but the last); the memory held. */
const CHUNK_BYTES = 8 * 1024 * 1024;
const ATTEMPTS = 5;
const baseDelayMs = 2_000;

interface UploadInput {
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

/** 429 / 5xx, and a network error or timeout (status 0) or 408: resend. */
const retryable = (e: unknown): boolean =>
  classify(e) === 'retry' || (e instanceof GoogleApiError && [0, 408].includes(e.status));

/**
 * One attempt from `at`. A 429 / 5xx / network failure waits, then answers with what Drive holds
 * (the file itself when the last chunk did land); the chunk is resent whole when Drive cannot say.
 */
async function attempt(s: Send, c: Chunk & { at: number; n: number }): Promise<ChunkResult> {
  try {
    const bytes = c.bytes.subarray(c.at - c.offset);
    return await s.api.putChunk({ session: s.session, offset: c.at, bytes, total: c.total });
  } catch (e) {
    if (c.n >= ATTEMPTS || !retryable(e)) throw e;
    await s.wait(baseDelayMs * 2 ** (c.n - 1));
    const unknown: ChunkResult = { committed: c.offset, fileId: null };
    return s.api.progress(s.session).catch(() => unknown);
  }
}

/** The file is made, or Drive holds the whole chunk (a 308 can hold less: resend the rest). */
const complete = (r: ChunkResult, end: number): boolean => r.fileId !== null || r.committed >= end;

/**
 * One chunk, resent from what Drive already holds after a failure (backoff, 5 attempts). Drive
 * holding the whole chunk already (it landed, the answer was lost) ends it: nothing is resent.
 */
async function sendChunk(s: Send, chunk: Chunk): Promise<ChunkResult> {
  const end = chunk.offset + chunk.bytes.length;
  let at = chunk.offset;
  for (let n = 1; ; n += 1) {
    const result = await attempt(s, { ...chunk, at, n });
    if (complete(result, end)) return result;
    at = held(result.committed, chunk.offset);
  }
}

/** Drive holds less than this chunk's start: bytes already dropped from memory, a gap. */
function held(committed: number, offset: number): number {
  if (committed < offset) throw new Error('drive_upload_gap');
  return committed;
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
