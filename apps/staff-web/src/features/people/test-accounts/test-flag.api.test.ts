import { describe, expect, it } from 'vitest';
import { ApiError, t } from '@ab/web-kit';
import { testFlagError } from './test-flag.api';

describe('testFlagError (docs/56)', () => {
  it('409: the family would mix a test login and a real student', () => {
    expect(testFlagError(new ApiError(409, { code: 'test_family_mismatch' }))).toBe(t.testAccounts.mismatch);
  });

  it('anything else: try again', () => {
    expect(testFlagError(new ApiError(500))).toBe(t.testAccounts.failed);
    expect(testFlagError(new Error('offline'))).toBe(t.testAccounts.failed);
  });
});
