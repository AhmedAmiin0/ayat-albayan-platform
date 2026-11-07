import type { Db } from '@/common/db/db.module';
import { headBytes } from '@/common/storage/storage.head';
import type { Bucket } from '@/common/storage/storage.paths';
import { listAll } from './list.supabase';
import type {
  ObjectInfo,
  ObjectKey,
  ObjectStore,
  PutObject,
  SignedGet,
  SignedPut,
  SlotKey,
} from './object-store';

const fail = (what: string, error: { message: string }): Error =>
  new Error(`storage ${what} failed: ${error.message}`);

interface SignMany {
  bucket: Bucket;
  keys: readonly string[];
  seconds: number;
}

/** A row Storage could sign (a missing object comes back with an error and no URL). */
interface SignedRow {
  path: string | null;
  signedUrl: string | null;
  error: string | null;
}

const signedRow = (row: SignedRow): [string, string][] =>
  row.path && row.signedUrl && !row.error ? [[row.path, row.signedUrl]] : [];

/**
 * Supabase Storage through the service-role client: today's behaviour, unchanged (R-REP-02/03,
 * R-PAY-01). The ONLY place in the API that calls db.storage (storage.guard.test.ts).
 */
export class SupabaseStore implements ObjectStore {
  constructor(private readonly db: Db) {}

  private from(bucket: Bucket) {
    return this.db.storage.from(bucket);
  }

  async put(o: PutObject): Promise<void> {
    // ifAbsent: Supabase refuses a duplicate (an error); the S3 adapter maps it to ObjectExists.
    const options = { contentType: o.contentType, upsert: o.ifAbsent !== true };
    const { error } = await this.from(o.bucket).upload(o.key, o.body, options);
    if (error) throw fail('upload', error);
  }

  async get(o: ObjectKey): Promise<Uint8Array | null> {
    const { data, error } = await this.from(o.bucket).download(o.key);
    if (error) return null;
    return new Uint8Array(await data.arrayBuffer());
  }

  async head(o: ObjectKey, bytes: number): Promise<Uint8Array | null> {
    const { data, error } = await this.from(o.bucket).createSignedUrl(o.key, 60);
    if (error) return null;
    return headBytes(data.signedUrl, bytes);
  }

  async info(o: ObjectKey): Promise<ObjectInfo | null> {
    const { data, error } = await this.from(o.bucket).info(o.key);
    if (error) return null;
    return { size: data.size ?? 0, contentType: data.contentType ?? '' };
  }

  /** The bucket's own size and mime limits refused anything else at upload time. */
  async exists(o: ObjectKey): Promise<boolean> {
    const { data, error } = await this.from(o.bucket).exists(o.key);
    return !error && data;
  }

  async remove(input: { bucket: Bucket; keys: readonly string[] }): Promise<void> {
    if (!input.keys.length) return;
    const { error } = await this.from(input.bucket).remove([...input.keys]);
    if (error) throw fail('remove', error);
  }

  list(input: { bucket: Bucket; prefix: string }): Promise<string[]> {
    return listAll(this.from(input.bucket), input.prefix);
  }

  async copy(input: { from: ObjectKey; to: ObjectKey }): Promise<void> {
    const { from, to } = input;
    const options = { destinationBucket: to.bucket };
    const { error } = await this.from(from.bucket).copy(from.key, to.key, options);
    if (error) throw fail('copy', error);
  }

  async signedGet(o: SignedGet): Promise<string> {
    const { data, error } = await this.from(o.bucket).createSignedUrl(o.key, o.seconds);
    if (error) throw fail('signed url', error);
    // Not createSignedUrl's own `download` option: supabase-js encodes it twice, and an Arabic
    // name would save as «AB-0183_…_%D8%AA….pdf». Encoded once, Storage sends filename*=UTF-8''.
    const save = o.download ? `&download=${encodeURIComponent(o.download)}` : '';
    return `${data.signedUrl}${save}`;
  }

  async signedGets(input: SignMany): Promise<Map<string, string>> {
    if (!input.keys.length) return new Map();
    const api = this.from(input.bucket);
    const { data, error } = await api.createSignedUrls([...input.keys], input.seconds);
    if (error) throw fail('signed urls', error);
    return new Map(data.flatMap(signedRow));
  }

  /** The bucket's own file_size_limit and allowed_mime_types check the file (docs/45). */
  async signedPut(o: SlotKey): Promise<SignedPut> {
    const { data, error } = await this.from(o.bucket).createSignedUploadUrl(o.key);
    if (error) throw fail('signed upload', error);
    return { token: data.token, signedUrl: data.signedUrl };
  }
}
