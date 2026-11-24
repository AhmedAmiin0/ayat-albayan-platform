import { httpsUrl } from '@ab/catalog';
import { z } from 'zod';
import type { Env } from './env';
import { blankIsUnset, optionalSecret } from './env.blank';

/**
 * Lesson recordings: the Supabase Storage S3 endpoint the LiveKit egress uploads the MP4s to,
 * https only (its keys sign every upload; T1). All five or none: unset = lessons are not recorded.
 */
export const RECORDING_SHAPE = {
  RECORDING_S3_ENDPOINT: z.preprocess(blankIsUnset, httpsUrl.optional()),
  RECORDING_S3_REGION: optionalSecret,
  RECORDING_S3_BUCKET: optionalSecret,
  RECORDING_S3_ACCESS_KEY: optionalSecret,
  RECORDING_S3_SECRET: optionalSecret,
};

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
