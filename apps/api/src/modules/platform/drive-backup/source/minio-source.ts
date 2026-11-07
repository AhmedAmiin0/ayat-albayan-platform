import { Readable } from 'node:stream';
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  type S3Client,
} from '@aws-sdk/client-s3';
import { z } from 'zod';
import { ObjectExists } from '@/common/storage/store/object-store';
import { orExists, orFail, orMissing } from '@/common/storage/store/s3-outputs';
import { s3Client } from '@/common/storage/store/s3-client';
import type { MinioEnv } from '@/config/env/env.storage';
import type { Bucket } from '@/common/storage/storage.paths';
import type { BackupSource, ListedObject, OpenedObject, RestoreObject } from './backup-source.port';

const unquote = (etag: string | undefined): string => (etag ?? '').replace(/"/g, '');

const pageSchema = z.object({
  Contents: z
    .array(z.object({ Key: z.string(), ETag: z.string().optional(), Size: z.number().optional() }))
    .optional(),
  IsTruncated: z.boolean().optional(),
  NextContinuationToken: z.string().optional(),
});
const getSchema = z.object({
  Body: z.custom<Readable>((v) => v instanceof Readable),
  ContentLength: z.number().optional(),
  ContentType: z.string().optional(),
  ETag: z.string().optional(),
});

/**
 * MinIO over the S3 API on the internal endpoint, with the app user's keys (read, list, put).
 * `signal` (the backup job's deadline) aborts every request and open body of this source.
 */
export class MinioSource implements BackupSource {
  private readonly s3: S3Client;
  private readonly opts: { abortSignal?: AbortSignal };

  constructor(
    private readonly m: MinioEnv,
    signal?: AbortSignal,
  ) {
    this.s3 = s3Client(m, m.endpoint);
    this.opts = signal ? { abortSignal: signal } : {};
  }

  private at(o: { bucket: Bucket; key: string }) {
    return { Bucket: `${this.m.bucketPrefix}${o.bucket}`, Key: o.key };
  }

  async *list(bucket: Bucket): AsyncGenerator<ListedObject> {
    const Bucket = `${this.m.bucketPrefix}${bucket}`;
    let token: string | undefined;
    do {
      const cmd = new ListObjectsV2Command({ Bucket, ContinuationToken: token });
      const page = pageSchema.parse(await orFail('list', () => this.s3.send(cmd, this.opts)));
      for (const o of page.Contents ?? []) {
        yield { bucket, key: o.Key, etag: unquote(o.ETag), size: o.Size ?? 0 };
      }
      token = page.IsTruncated === true ? page.NextContinuationToken : undefined;
    } while (token);
  }

  async open(o: { bucket: Bucket; key: string }): Promise<OpenedObject | null> {
    const cmd = new GetObjectCommand(this.at(o));
    const out = await orMissing('download', () => this.s3.send(cmd, this.opts));
    const got = out === null ? null : getSchema.parse(out);
    return (
      got && {
        size: got.ContentLength ?? 0,
        etag: unquote(got.ETag),
        contentType: got.ContentType ?? 'application/octet-stream',
        body: got.Body,
      }
    );
  }

  /** ifAbsent unless overwrite: a held key is kept (HEAD first, then If-None-Match: *). */
  async restore(o: RestoreObject): Promise<'put' | 'kept'> {
    const head = () => this.s3.send(new HeadObjectCommand(this.at(o)), this.opts);
    const held = !o.overwrite && (await orMissing('info', head)) !== null;
    if (held) return 'kept';
    const only = o.overwrite ? {} : { IfNoneMatch: '*' };
    const input = { ...this.at(o), Body: Readable.from(o.body), ContentLength: o.size, ...only };
    const cmd = new PutObjectCommand({ ...input, ContentType: o.contentType });
    return orExists('upload', () => this.s3.send(cmd, this.opts)).then(
      () => 'put' as const,
      (e: unknown) => (e instanceof ObjectExists ? 'kept' : Promise.reject(e as Error)),
    );
  }
}
