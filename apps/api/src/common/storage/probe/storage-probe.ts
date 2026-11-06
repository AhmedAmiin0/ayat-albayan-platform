import { randomUUID } from 'node:crypto';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { loadEnv } from '@/config/env/env';
import { storageEnv, type MinioEnv } from '@/config/env/env.storage';
import { minioStore } from '@/common/storage/store/s3-client';
import type { ObjectStore } from '@/common/storage/store/object-store';

/** POST /settings/integrations/storage-probe answers. */
export interface StorageProbeResult {
  ok: true;
  ms: number;
}

const refused = (code: 'storage_not_configured' | 'storage_probe_failed', status: HttpStatus) =>
  new HttpException({ message: code }, status);

/** The adapter of the saved MinIO config; tests pass their own. */
type MinioStoreOf = (m: MinioEnv) => ObjectStore;

interface ProbeInput {
  config?: MinioEnv | null;
  storeOf?: MinioStoreOf;
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

/**
 * «اختبار الاتصال» (docs/45): puts a small object under _probe/ in the reports bucket, reads it
 * back and deletes it, whatever STORAGE_DRIVER says (test before the cut-over). The log and the
 * answer name the step only, never a key or a URL.
 */
@Injectable()
export class StorageProbe {
  private readonly log = new Logger(StorageProbe.name);

  /** The saved config and the real adapter by default (tests pass theirs). */
  async run(input: ProbeInput = {}): Promise<StorageProbeResult> {
    const config = input.config === undefined ? storageEnv(loadEnv()).minio : input.config;
    if (!config) throw refused('storage_not_configured', HttpStatus.CONFLICT);
    const started = Date.now();
    await roundTrip((input.storeOf ?? minioStore)(config)).catch((e: unknown) => {
      this.log.warn(`storage probe failed: ${e instanceof Error ? e.message : 'unknown'}`);
      throw refused('storage_probe_failed', HttpStatus.BAD_GATEWAY);
    });
    return { ok: true, ms: Date.now() - started };
  }
}
