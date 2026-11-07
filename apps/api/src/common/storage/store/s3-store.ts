import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import type { Bucket } from '@/common/storage/storage.paths';
import { withinBucketRule } from './bucket-rules';
import type {
  ObjectInfo,
  ObjectKey,
  ObjectStore,
  PutObject,
  SignedGet,
  SignedPut,
} from './object-store';
import { getOutput, headOutput, listOutput, orFail, orMissing } from './s3-outputs';

export type S3Command =
  | GetObjectCommand
  | PutObjectCommand
  | HeadObjectCommand
  | DeleteObjectCommand
  | ListObjectsV2Command
  | CopyObjectCommand;

/** The S3 calls an adapter makes: the internal client's send, and a signer for the public host. */
interface S3Parts {
  send: (command: S3Command) => Promise<unknown>;
  sign: (command: GetObjectCommand | PutObjectCommand, seconds: number) => Promise<string>;
  /** Our bucket name → the MinIO bucket (MINIO_BUCKET_PREFIX + name). */
  bucketOf: (bucket: Bucket) => string;
}

const sourceOf = (bucket: string, key: string): string =>
  `${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

/** RFC 6266/5987, like Supabase's ?download=: the browser saves it under this (Arabic) name. */
const attachment = (name: string): string =>
  `attachment; filename*=UTF-8''${encodeURIComponent(name)}`;

/** MinIO through the S3 API (path-style; docs/45). Errors surface, a missing object is null. */
export class S3Store implements ObjectStore {
  constructor(private readonly s3: S3Parts) {}

  private at(o: ObjectKey) {
    return { Bucket: this.s3.bucketOf(o.bucket), Key: o.key };
  }

  async put(o: PutObject): Promise<void> {
    const cmd = new PutObjectCommand({ ...this.at(o), Body: o.body, ContentType: o.contentType });
    await orFail('upload', () => this.s3.send(cmd));
  }

  async get(o: ObjectKey): Promise<Uint8Array | null> {
    const out = await orMissing('download', () => this.s3.send(new GetObjectCommand(this.at(o))));
    return out === null ? null : getOutput.parse(out).Body.transformToByteArray();
  }

  async head(o: ObjectKey, bytes: number): Promise<Uint8Array | null> {
    const cmd = new GetObjectCommand({ ...this.at(o), Range: `bytes=0-${bytes - 1}` });
    const out = await orMissing('head', () => this.s3.send(cmd));
    if (out === null) return null;
    return (await getOutput.parse(out).Body.transformToByteArray()).slice(0, bytes);
  }

  async info(o: ObjectKey): Promise<ObjectInfo | null> {
    const out = await orMissing('info', () => this.s3.send(new HeadObjectCommand(this.at(o))));
    if (out === null) return null;
    const head = headOutput.parse(out);
    return { size: head.ContentLength ?? 0, contentType: head.ContentType ?? '' };
  }

  async exists(o: ObjectKey): Promise<boolean> {
    const info = await this.info(o);
    return info !== null && withinBucketRule(o.bucket, info);
  }

  async remove(input: { bucket: Bucket; keys: readonly string[] }): Promise<void> {
    const Bucket = this.s3.bucketOf(input.bucket);
    const one = (Key: string) =>
      orFail('remove', () => this.s3.send(new DeleteObjectCommand({ Bucket, Key })));
    await Promise.all(input.keys.map(one));
  }

  async list(input: { bucket: Bucket; prefix: string }): Promise<string[]> {
    const Bucket = this.s3.bucketOf(input.bucket);
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const cmd = new ListObjectsV2Command({
        Bucket,
        Prefix: input.prefix,
        ContinuationToken: token,
      });
      const out = listOutput.parse(await orFail('list', () => this.s3.send(cmd)));
      keys.push(...(out.Contents ?? []).flatMap((row) => (row.Key ? [row.Key] : [])));
      token = out.IsTruncated ? out.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }

  async copy(input: { from: ObjectKey; to: ObjectKey }): Promise<void> {
    const CopySource = sourceOf(this.s3.bucketOf(input.from.bucket), input.from.key);
    const cmd = new CopyObjectCommand({ ...this.at(input.to), CopySource });
    await orFail('copy', () => this.s3.send(cmd));
  }

  signedGet(o: SignedGet): Promise<string> {
    const disposition = o.download ? { ResponseContentDisposition: attachment(o.download) } : {};
    const cmd = new GetObjectCommand({ ...this.at(o), ...disposition });
    return orFail('signed url', () => this.s3.sign(cmd, o.seconds));
  }

  /** Signing is local (no request): every key is signed; a missing object is 404 when opened. */
  async signedGets(input: {
    bucket: Bucket;
    keys: readonly string[];
    seconds: number;
  }): Promise<Map<string, string>> {
    const { bucket, seconds } = input;
    const signed = await Promise.all(
      input.keys.map(async (key) => [key, await this.signedGet({ bucket, key, seconds })] as const),
    );
    return new Map(signed);
  }

  async signedPut(o: ObjectKey): Promise<SignedPut> {
    const signedUrl = await orFail('signed upload', () =>
      this.s3.sign(new PutObjectCommand({ ...this.at(o), IfNoneMatch: '*' }), UPLOAD_SECONDS),
    );
    return { token: '', signedUrl };
  }
}

/**
 * A signed upload slot lives 15 minutes and carries If-None-Match: * (signed): one upload per key,
 * so a file the API already checked can never be replaced through the same URL (docs/45).
 */
const UPLOAD_SECONDS = 15 * 60;
