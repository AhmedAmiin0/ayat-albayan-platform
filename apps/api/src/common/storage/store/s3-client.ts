import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MinioEnv } from '@/config/env/env.storage';
import { SLOT_SIGNED_HEADERS } from './s3-slot';
import { S3Store, type S3Command } from './s3-store';

/** One S3 client per host: path-style (MinIO), checksums only where S3 requires them. */
export function s3Client(m: MinioEnv, endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: m.region,
    forcePathStyle: true,
    credentials: { accessKeyId: m.accessKey, secretAccessKey: m.secretKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 2,
    // A stalled MinIO fails the call (error surfaced) instead of holding a request open.
    requestHandler: { connectionTimeout: 3_000, requestTimeout: 60_000 },
  });
}

/**
 * MinIO's adapter: requests go to the internal endpoint (http://ayat-minio:9000); URLs are signed
 * for the public host (https://files.ayatalbayan.com), which Caddy proxies with its Host header
 * kept, so the signature MinIO checks is the one the client was given (docs/45).
 */
export function minioStore(m: MinioEnv): S3Store {
  const internal = s3Client(m, m.endpoint);
  const publicHost = s3Client(m, m.publicUrl);
  return new S3Store({
    send: (command: S3Command) => internal.send(command as Parameters<S3Client['send']>[0]),
    // A slot's size and type stay request headers MinIO checks (absent on a GET: nothing to sign).
    sign: (command, seconds) => {
      const options = { expiresIn: seconds, signableHeaders: SLOT_SIGNED_HEADERS };
      return getSignedUrl(publicHost, command, options);
    },
    bucketOf: (bucket) => `${m.bucketPrefix}${bucket}`,
  });
}
