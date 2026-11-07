import { createHash } from 'node:crypto';
import { buffer } from 'node:stream/consumers';
import type { Bucket } from '@/common/storage/storage.paths';
import type { BackupSource, ListedObject, OpenedObject, RestoreObject } from './backup-source.port';

// An in-memory MinIO for the backup's tests: objects with MD5 ETags, plus objects that vanish
// after the listing or fail to read (a damaged disk sector).

interface Held {
  bytes: Buffer;
  type: string;
  etag: string;
}

const md5 = (b: Buffer): string => createHash('md5').update(b).digest('hex');

async function* failing(): AsyncGenerator<Uint8Array> {
  yield Buffer.from('half');
  throw new Error('read error');
}

export class FakeMinio implements BackupSource {
  readonly objects = new Map<string, Held>();
  /** Listed, then gone when opened. */
  readonly vanish = new Set<string>();
  /** Opened, then the read fails half way. */
  readonly unreadable = new Set<string>();

  set(input: { bucket: Bucket; key: string; body: string | Buffer; type?: string }): string {
    const bytes = Buffer.from(input.body);
    const held = { bytes, type: input.type ?? 'application/pdf', etag: md5(bytes) };
    this.objects.set(`${input.bucket}/${input.key}`, held);
    return held.etag;
  }

  text(id: string): string | undefined {
    return this.objects.get(id)?.bytes.toString('utf8');
  }

  async *list(bucket: Bucket): AsyncGenerator<ListedObject> {
    const ids = [...this.objects.keys()].filter((id) => id.startsWith(`${bucket}/`)).sort();
    for (const id of ids) {
      const held = this.objects.get(id);
      const key = id.slice(bucket.length + 1);
      if (held) yield { bucket, key, etag: held.etag, size: held.bytes.length };
    }
  }

  open(o: { bucket: Bucket; key: string }): Promise<OpenedObject | null> {
    const id = `${o.bucket}/${o.key}`;
    const held = this.vanish.has(id) ? undefined : this.objects.get(id);
    if (!held) return Promise.resolve(null);
    const body = this.unreadable.has(id)
      ? failing()
      : (async function* () {
          yield held.bytes;
        })();
    return Promise.resolve({
      size: held.bytes.length,
      etag: held.etag,
      contentType: held.type,
      body,
    });
  }

  async restore(o: RestoreObject): Promise<'put' | 'kept'> {
    const id = `${o.bucket}/${o.key}`;
    if (this.objects.has(id) && !o.overwrite) return 'kept';
    const bytes = await buffer(o.body);
    if (bytes.length !== o.size) throw new Error('size mismatch');
    this.objects.set(id, { bytes, type: o.contentType, etag: md5(bytes) });
    return 'put';
  }
}
