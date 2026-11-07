import { describe, expect, it } from 'vitest';
import { BUCKETS } from '@/common/storage/storage.paths';
import { BUCKET_RULES, withinBucketRule } from './bucket-rules';

describe('MinIO applies the Supabase bucket limits (docs/45)', () => {
  it('every bucket has a rule', () => {
    expect(Object.keys(BUCKET_RULES).sort()).toEqual(Object.values(BUCKETS).sort());
  });

  it.each([
    ['receipts', 1000, 'image/jpeg', true],
    ['receipts', 1000, 'image/jpeg; charset=binary', true],
    ['receipts', 11 * 1024 * 1024, 'image/jpeg', false],
    ['receipts', 1000, 'text/html', false],
    ['avatars', 3 * 1024 * 1024, 'image/png', false],
    ['wa-media', 15 * 1024 * 1024, 'video/mp4', true],
    ['recordings', 5e9, 'video/mp4', true],
    ['reports', 1000, '', false],
  ] as const)('%s, %i bytes, %s → %s', (...row) => {
    const [bucket, size, contentType, ok] = row;
    expect(withinBucketRule(bucket, { size, contentType })).toBe(ok);
  });
});
