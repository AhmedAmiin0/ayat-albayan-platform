import type { Env } from './env';

/** Where the LiveKit egress uploads lesson recordings (Supabase Storage through its S3 protocol). */
export interface RecordingEnv {
  endpoint: string;
  region: string;
  bucket: string;
  accessKey: string;
  secret: string;
}

/** null = RECORDING_S3_* not (all) set: lessons are not recorded. Never a boot failure. */
export function recordingEnv(env: Env): RecordingEnv | null {
  const {
    RECORDING_S3_ENDPOINT: endpoint,
    RECORDING_S3_REGION: region,
    RECORDING_S3_BUCKET: bucket,
    RECORDING_S3_ACCESS_KEY: accessKey,
    RECORDING_S3_SECRET: secret,
  } = env;
  if (!endpoint || !region || !bucket || !accessKey || !secret) return null;
  return { endpoint: endpoint.replace(/\/+$/, ''), region, bucket, accessKey, secret };
}
