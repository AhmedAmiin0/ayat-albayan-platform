import { setTimeout as sleep } from 'node:timers/promises';
import { classify, GoogleApiError } from '@/modules/platform/google-sync';
import { rechunk, withLast } from './chunks';
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
  /** The job's deadline: stops the waits and the loop (the Drive calls get it in the adapter). */
  signal?: AbortSignal;
  /** Told the file id the moment Drive answers with it (kept even if the pipeline fails later). */
  onFile?: (fileId: string) => void;
}

interface Send {
  api: DriveBackupApi;
  session: string;
  wait: (ms: number) => Promise<unknown>;
  signal: AbortSignal | undefined;
  onFile: ((fileId: string) => void) | undefined;
}

interface Chunk {
  offset: number;
  bytes: Buffer;
  total: number | null;
}
type Try = Chunk & { at: number; n: number };

/** 429 / 5xx, and a network error or timeout (status 0) or 408: resend. */
const retryable = (e: unknown): boolean =>
  classify(e) === 'retry' || (e instanceof GoogleApiError && [0, 408].includes(e.status));

/** The file is made, or Drive holds the whole chunk (a 308 can hold less: resend the rest). */
const complete = (r: ChunkResult, end: number): boolean => r.fileId !== null || r.committed >= end;

/** The file id goes to `onFile` the moment Drive answers with it (before anything can fail). */
function told(s: Send, r: ChunkResult): ChunkResult {
  if (r.fileId !== null) s.onFile?.(r.fileId);
  return r;
}

/** What Drive holds of the session; when it cannot say, what it last confirmed (`at`). */
const asked = (s: Send, at: number): Promise<ChunkResult> =>
  s.api.progress(s.session).catch(() => ({ committed: at, fileId: null }));

async function retried(s: Send, c: Try): Promise<ChunkResult> {
  await s.wait(baseDelayMs * 2 ** (c.n - 1));
  return asked(s, c.at);
}

/** The last attempt failed: the final chunk may have landed (its file is kept), else throw. */
async function lastLook(s: Send, c: Try, e: unknown): Promise<ChunkResult> {
  const r = await asked(s, c.at);
  if (complete(r, c.offset + c.bytes.length)) return r;
  throw e;
}

/**
 * One attempt from `at`. A 429 / 5xx / network failure waits, then answers with what Drive holds
 * (the file itself when the last chunk did land); after the last attempt Drive is asked once more.
 */
async function attempt(s: Send, c: Try): Promise<ChunkResult> {
  try {
    const bytes = c.bytes.subarray(c.at - c.offset);
    return await s.api.putChunk({ session: s.session, offset: c.at, bytes, total: c.total });
  } catch (e) {
    if (!retryable(e)) throw e;
    return c.n >= ATTEMPTS ? lastLook(s, c, e) : retried(s, c);
  }
}

/**
 * One chunk, resent from what Drive already holds after a failure (backoff, 5 attempts). Drive
 * holding the whole chunk already (it landed, the answer was lost) ends it: nothing is resent.
 * Answers that move nothing forward (a 308 with no progress) stop it after 5 in a row.
 */
async function sendChunk(s: Send, chunk: Chunk): Promise<ChunkResult> {
  const end = chunk.offset + chunk.bytes.length;
  let at = chunk.offset;
  let stalls = 0;
  for (let n = 1; ; n += 1) {
    s.signal?.throwIfAborted();
    const result = await attempt(s, { ...chunk, at, n });
    if (complete(result, end)) return told(s, result);
    const next = held(result.committed, chunk.offset);
    stalls = next > at ? 0 : stalls + 1;
    if (stalls >= ATTEMPTS) throw new Error('drive_upload_stalled');
    at = next;
  }
}

/** Drive holds less than this chunk's start: bytes already dropped from memory, a gap. */
function held(committed: number, offset: number): number {
  if (committed < offset) throw new Error('drive_upload_gap');
  return committed;
}

/** Every chunk in order (the last one's answer carries the file id). */
async function sendAll(s: Send, input: UploadInput) {
  let offset = 0;
  let fileId: string | null = null;
  const chunks = withLast(rechunk(input.source, input.chunkBytes ?? CHUNK_BYTES));
  for await (const { item, last } of chunks) {
    const total = last ? offset + item.length : null;
    fileId = (await sendChunk(s, { offset, bytes: item, total })).fileId;
    offset += item.length;
  }
  return { fileId, bytes: offset };
}

/**
 * Streams `source` into one Drive file through a resumable session: never more than one chunk in
 * memory, nothing on disk. Returns the file id and the bytes uploaded (the compressed size).
 */
export async function uploadStream(input: UploadInput): Promise<{ fileId: string; bytes: number }> {
  const { api, signal, onFile } = input;
  const wait = input.wait ?? ((ms: number) => sleep(ms, undefined, { signal }));
  const session = await api.startUpload(input.target);
  const { fileId, bytes } = await sendAll({ api, session, wait, signal, onFile }, input);
  if (!fileId) throw new Error('drive_upload_incomplete');
  return { fileId, bytes };
}
