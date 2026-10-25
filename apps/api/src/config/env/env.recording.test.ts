import { describe, expect, it } from 'vitest';
import { loadEnv } from './env';
import { recordingEnv } from './env.recording';

const BASE = { SUPABASE_URL: 'http://127.0.0.1:54321', SUPABASE_SERVICE_ROLE_KEY: 'k' };
const S3 = {
  RECORDING_S3_ENDPOINT: 'https://project.storage.example.test/storage/v1/s3/',
  RECORDING_S3_REGION: 'eu-central-1',
  RECORDING_S3_BUCKET: 'recordings',
  RECORDING_S3_ACCESS_KEY: 'access',
  RECORDING_S3_SECRET: 'secret',
};

describe('env: recordings (optional, all five or none)', () => {
  it('boots without them; lessons are then not recorded', () => {
    expect(recordingEnv(loadEnv(BASE))).toBeNull();
    expect(recordingEnv(loadEnv({ ...BASE, RECORDING_S3_ENDPOINT: '', RECORDING_S3_SECRET: '' }))).toBeNull();
  });

  it('is configured only when all five are there (endpoint without a trailing slash)', () => {
    expect(recordingEnv(loadEnv({ ...BASE, ...S3 }))).toEqual({
      endpoint: 'https://project.storage.example.test/storage/v1/s3',
      region: 'eu-central-1',
      bucket: 'recordings',
      accessKey: 'access',
      secret: 'secret',
    });
    expect(recordingEnv(loadEnv({ ...BASE, ...S3, RECORDING_S3_SECRET: '' }))).toBeNull();
    expect(recordingEnv(loadEnv({ ...BASE, RECORDING_S3_BUCKET: 'recordings' }))).toBeNull();
  });

  it('a malformed endpoint fails the boot', () => {
    expect(() => loadEnv({ ...BASE, ...S3, RECORDING_S3_ENDPOINT: 'not a url' })).toThrow();
  });
});
