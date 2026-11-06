import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { MinioEnv } from '@/config/env/env.storage';
import { S3Store, type S3Command } from './s3-store';

/** One S3 client per host: path-style (MinIO), checksums only where S3 requires them. */
function client(m: MinioEnv, endpoint: string): S3Client {
  return new S3Client({
    endpoint,
    region: m.region,
    forcePathStyle: true,
    credentials: { accessKeyId: m.accessKey, secretAccessKey: m.secretKey },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
    maxAttempts: 2,
  });
}

/**
 * MinIO's adapter: requests go to the internal endpoint (http://ayat-minio:9000); URLs are signed
 * for the public host (https://files.ayatalbayan.com), which Caddy proxies with its Host header
 * kept, so the signature MinIO checks is the one the client was given (docs/45).
 */
export function minioStore(m: MinioEnv): S3Store {
  const internal = client(m, m.endpoint);
  const publicHost = client(m, m.publicUrl);
  return new S3Store({
    send: (command: S3Command) => internal.send(command as Parameters<S3Client['send']>[0]),
    sign: (command, seconds) => getSignedUrl(publicHost, command, { expiresIn: seconds }),
    bucketOf: (bucket) => `${m.bucketPrefix}${bucket}`,
  });
}
