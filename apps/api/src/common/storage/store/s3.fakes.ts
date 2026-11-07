import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { S3Store, type S3Command } from './s3-store';

// An in-memory S3 (no network) for the adapter and router tests: bucket/key → bytes + type.

interface Stored {
  body: Uint8Array;
  type: string;
}

const notFound = () =>
  Object.assign(new Error('NoSuchKey'), { name: 'NoSuchKey', $metadata: { httpStatusCode: 404 } });
const taken = () =>
  Object.assign(new Error('PreconditionFailed'), {
    name: 'PreconditionFailed',
    $metadata: { httpStatusCode: 412 },
  });
const asBytes = (body: unknown): Uint8Array =>
  body instanceof Uint8Array ? body : new Uint8Array();
const answer = (s: Stored, range?: string) => {
  const end = Number(/bytes=0-(\d+)/.exec(range ?? '')?.[1] ?? s.body.byteLength - 1);
  return { Body: { transformToByteArray: () => Promise.resolve(s.body.slice(0, end + 1)) } };
};

export function fakeS3() {
  const objects = new Map<string, Stored>();
  const at = (b?: string, k?: string) => `${b ?? ''}/${k ?? ''}`;
  const found = (id: string): Stored => {
    const s = objects.get(id);
    if (!s) throw notFound();
    return s;
  };
  const handlers: [new (...a: never[]) => S3Command, (c: S3Command) => unknown][] = [
    [
      PutObjectCommand,
      (c) => {
        const i = (c as PutObjectCommand).input;
        if (i.IfNoneMatch === '*' && objects.has(at(i.Bucket, i.Key))) throw taken();
        objects.set(at(i.Bucket, i.Key), { body: asBytes(i.Body), type: i.ContentType ?? '' });
        return {};
      },
    ],
    [
      GetObjectCommand,
      (c) => {
        const i = (c as GetObjectCommand).input;
        return answer(found(at(i.Bucket, i.Key)), i.Range);
      },
    ],
    [
      HeadObjectCommand,
      (c) => {
        const i = (c as HeadObjectCommand).input;
        const s = found(at(i.Bucket, i.Key));
        return { ContentLength: s.body.byteLength, ContentType: s.type };
      },
    ],
    [
      DeleteObjectCommand,
      (c) => objects.delete(at(c.input.Bucket, (c as DeleteObjectCommand).input.Key)),
    ],
    [
      ListObjectsV2Command,
      (c) => {
        const i = (c as ListObjectsV2Command).input;
        const keys = [...objects.keys()].filter((id) => id.startsWith(at(i.Bucket, i.Prefix)));
        return { Contents: keys.map((id) => ({ Key: id.slice(`${i.Bucket ?? ''}/`.length) })) };
      },
    ],
    [
      CopyObjectCommand,
      (c) => {
        const i = (c as CopyObjectCommand).input;
        objects.set(at(i.Bucket, i.Key), found(decodeURIComponent(i.CopySource ?? '')));
        return {};
      },
    ],
  ];
  const sent: S3Command[] = [];
  const send = (c: S3Command): Promise<unknown> => {
    sent.push(c);
    const handler = handlers.find(([type]) => c instanceof type)?.[1];
    return handler
      ? Promise.resolve().then(() => handler(c))
      : Promise.reject(new Error('unexpected command'));
  };
  const sign = (c: GetObjectCommand | PutObjectCommand, seconds: number) =>
    Promise.resolve(
      `https://files.example.com/${c.input.Bucket ?? ''}/${c.input.Key ?? ''}?X-Amz-Expires=${seconds}`,
    );
  const store = new S3Store({ send, sign, bucketOf: (b) => `ab-${b}` });
  return { objects, sent, store };
}
