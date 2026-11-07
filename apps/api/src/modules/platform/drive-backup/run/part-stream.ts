import type {
  BackupSource,
  ListedObject,
  OpenedObject,
} from '@/modules/platform/drive-backup/source/backup-source.port';
import { STREAMED_MIN } from '@/modules/platform/drive-backup/plan/parts';
import { entryHead, padding, TAR_END } from '@/modules/platform/drive-backup/archive/tar';

/**
 * Objects up to this size are read whole first (a failed read skips them cleanly), into one buffer
 * of their size: 1x the object in memory. Larger ones stream in a part of their own (parts.ts).
 */
const BUFFER_MAX = STREAMED_MIN;

export interface PartEntry {
  bucket: string;
  key: string;
  etag: string;
  size: number;
  contentType: string;
}
export type SkipReason = 'missing' | 'read_failed';
export interface PartReport {
  entries: PartEntry[];
  skipped: { bucket: string; key: string; reason: SkipReason }[];
  rawBytes: number;
}
export const emptyReport = (): PartReport => ({ entries: [], skipped: [], rawBytes: 0 });

interface Ready {
  opened: OpenedObject;
  /** The whole object (small ones); null: streamed. */
  bytes: Buffer | null;
}

function skip(report: PartReport, o: ListedObject, reason: SkipReason): null {
  report.skipped.push({ bucket: o.bucket, key: o.key, reason });
  return null;
}

/** Exactly `size` bytes into one buffer; a longer or shorter read fails (the object is skipped). */
async function readWhole(opened: OpenedObject): Promise<Buffer> {
  const out = Buffer.allocUnsafe(opened.size);
  let at = 0;
  for await (const c of opened.body) {
    if (at + c.length > out.length) throw new Error('object_size_changed');
    out.set(c, at);
    at += c.length;
  }
  if (at !== out.length) throw new Error('object_cut_off');
  return out;
}

/** Open (and read, when small) one object; a missing or unreadable one is skipped and reported. */
async function ready(source: BackupSource, o: ListedObject, report: PartReport) {
  try {
    const opened = await source.open(o);
    if (!opened) return skip(report, o, 'missing');
    if (opened.size > BUFFER_MAX) return { opened, bytes: null };
    return { opened, bytes: await readWhole(opened) };
  } catch {
    return skip(report, o, 'read_failed');
  }
}

/** A large object's bytes, exactly its size: a cut-off or grown read aborts the part (retried). */
async function* streamed(opened: OpenedObject): AsyncGenerator<Buffer> {
  let n = 0;
  for await (const c of opened.body) {
    n += c.length;
    if (n > opened.size) throw new Error('object_size_changed');
    yield Buffer.from(c);
  }
  if (n !== opened.size) throw new Error('object_cut_off');
}

const mtime = (now: Date): number => Math.floor(now.getTime() / 1000);

function head(r: Ready, o: ListedObject, now: Date): Buffer {
  const { size, etag, contentType } = r.opened;
  const records = {
    'AB.bucket': o.bucket,
    'AB.key': o.key,
    'AB.etag': etag,
    'AB.contenttype': contentType,
  };
  return entryHead({ path: `${o.bucket}/${o.key}`, size, mtime: mtime(now), records });
}

export interface PartInput {
  source: BackupSource;
  objects: readonly ListedObject[];
  report: PartReport;
  /** Written into manifest.json, the archive's last entry. */
  meta: Readonly<Record<string, string>>;
  now: Date;
}

/** The part's tar: each object (pax header, data, padding), then manifest.json, then the end. */
export async function* partBytes(input: PartInput): AsyncGenerator<Buffer> {
  const { report, now } = input;
  for (const o of input.objects) {
    const r: Ready | null = await ready(input.source, o, report);
    if (!r) continue;
    yield head(r, o, now);
    yield* r.bytes ? [r.bytes] : streamed(r.opened);
    yield padding(r.opened.size);
    const { size, etag, contentType } = r.opened;
    report.entries.push({ bucket: o.bucket, key: o.key, etag, size, contentType });
    report.rawBytes += size;
  }
  const manifest = Buffer.from(JSON.stringify({ ...input.meta, ...report }), 'utf8');
  const path = 'manifest.json';
  yield entryHead({ path, size: manifest.length, mtime: mtime(now), records: {} });
  yield manifest;
  yield padding(manifest.length);
  yield TAR_END;
}
