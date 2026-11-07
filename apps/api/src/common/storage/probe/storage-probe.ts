import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { storageEnv, type MinioEnv } from '@/config/env/env.storage';
import { createHttp } from '@/common/infra/http/http';
import type { Http } from '@/common/infra/http/http.types';
import type { FetchLike } from '@/common/infra/http/failure';
import { minioStore } from '@/common/storage/store/s3-client';
import type { ObjectStore } from '@/common/storage/store/object-store';

/** POST /settings/integrations/storage-probe answers. */
export interface StorageProbeResult {
  ok: true;
  ms: number;
}

type ProbeCode = 'storage_not_configured' | 'storage_probe_failed' | 'storage_public_failed';

const refused = (code: ProbeCode, status: HttpStatus) =>
  new HttpException({ message: code }, status);

/** The adapter of the saved MinIO config; tests pass their own. */
type MinioStoreOf = (m: MinioEnv) => ObjectStore;

interface ProbeInput {
  config?: MinioEnv | null;
  storeOf?: MinioStoreOf;
  /** Test seam of the public requests (the one outbound client's fetch). */
  fetch?: FetchLike;
}

/** Put, read back, delete; throws on any step or when the bytes differ. */
async function roundTrip(store: ObjectStore): Promise<void> {
  const o = { bucket: 'reports' as const, key: `_probe/${randomUUID()}.txt` };
  const body = new TextEncoder().encode(`probe ${new Date().toISOString()}`);
  await store.put({ ...o, body, contentType: 'text/plain' });
  const back = await store.get(o);
  await store.remove({ bucket: o.bucket, keys: [o.key] });
  if (back?.byteLength !== body.byteLength) throw new Error('read back differs');
}

/** A tiny PDF: the reports bucket admits PDFs only (bucket-rules.ts). */
const PROBE_PDF = new TextEncoder().encode('%PDF-1.4\n% ayat probe\n%%EOF\n');

/** The public host, through the api's one outbound client: bounded, never follows a redirect. */
const publicHttp = (fetch?: FetchLike): Http =>
  createHttp({
    name: 'storage-probe',
    base: () => '',
    headers: () => Promise.resolve({}),
    timeoutMs: 10_000,
    redirect: 'error',
    errorBody: 'omit',
    errors: { default: (f) => new Error(`public ${f.kind === 'status' ? f.status : f.kind}`) },
    ...(fetch ? { fetch } : {}),
  });

const ok = (status: number): boolean => status >= 200 && status < 300;

/**
 * What the apps do, through MINIO_PUBLIC_URL: PUT to a signed slot (If-None-Match: *, the signed
 * size and type), GET it back through a signed URL. The object is removed whatever happens.
 */
async function publicRoundTrip(store: ObjectStore, http: Http): Promise<void> {
  const o = { bucket: 'reports' as const, key: `_probe/${randomUUID()}.pdf` };
  const file = { size: PROBE_PDF.byteLength, mime: 'application/pdf' };
  try {
    const slot = await store.signedPut({ ...o, file });
    const headers = { 'content-type': file.mime, 'if-none-match': '*' };
    const put = await http.status({ path: slot.signedUrl, method: 'PUT', raw: PROBE_PDF, headers });
    if (!ok(put)) throw new Error(`public PUT ${put}`);
    const url = await store.signedGet({ ...o, seconds: 60 });
    const got = await http.bytes({ path: url, maxBytes: 1024, tooLarge: () => new Error('size') });
    if (got.bytes.byteLength !== PROBE_PDF.byteLength) throw new Error('public read differs');
  } finally {
    await store.remove({ bucket: o.bucket, keys: [o.key] }).catch(() => undefined);
  }
}

/**
 * «اختبار الاتصال» (docs/45): puts a small object under _probe/ in the reports bucket, reads it
 * back and deletes it, whatever STORAGE_DRIVER says (test before the cut-over); then the same
 * through MINIO_PUBLIC_URL as the apps do (502 storage_public_failed: a wrong public address or
 * Caddy site). The log and the answer name the step only, never a key or a URL.
 */
@Injectable()
export class StorageProbe {
  private readonly log = new Logger(StorageProbe.name);

  /** The saved config and the real adapter by default (tests pass theirs). */
  async run(input: ProbeInput = {}): Promise<StorageProbeResult> {
    const config = input.config === undefined ? storageEnv(loadEnv()).minio : input.config;
    if (!config) throw refused('storage_not_configured', HttpStatus.CONFLICT);
    const started = Date.now();
    const store = (input.storeOf ?? minioStore)(config);
    await roundTrip(store).catch(this.fail('storage_probe_failed'));
    const http = publicHttp(input.fetch);
    await publicRoundTrip(store, http).catch(this.fail('storage_public_failed'));
    return { ok: true, ms: Date.now() - started };
  }

  private fail(code: ProbeCode) {
    return (e: unknown): never => {
      this.log.warn(`${code}: ${e instanceof Error ? e.message : 'unknown'}`);
      throw refused(code, HttpStatus.BAD_GATEWAY);
    };
  }
}
