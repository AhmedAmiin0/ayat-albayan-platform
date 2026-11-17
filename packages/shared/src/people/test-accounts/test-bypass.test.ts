import { describe, expect, it } from 'vitest';
import { canSkip, TEST_BYPASS, testCheckSchema, userOnlyFlags, type TestCheck } from './test-bypass';

const BOTH = { userIsTest: true, studentIsTest: true };
const NONE = { userIsTest: false, studentIsTest: false };
const TEST_USER_REAL_STUDENT = { userIsTest: true, studentIsTest: false };
const REAL_USER_TEST_STUDENT = { userIsTest: false, studentIsTest: true };

const DOUBLE: readonly TestCheck[] = ['watermark', 'join_window', 'screen_capture'];

describe('TEST_BYPASS', () => {
  it('lists exactly the owner four checks; only rate_limits is user-only', () => {
    expect(Object.keys(TEST_BYPASS).sort()).toEqual([...testCheckSchema.options].sort());
    expect(TEST_BYPASS).toEqual({
      watermark: 'user_and_student',
      rate_limits: 'user',
      join_window: 'user_and_student',
      screen_capture: 'user_and_student',
    });
  });

  it.each(DOUBLE)('%s: skipped only when the user AND the student are test', (check) => {
    expect(canSkip(check, BOTH)).toBe(true);
    expect(canSkip(check, NONE)).toBe(false);
    expect(canSkip(check, TEST_USER_REAL_STUDENT)).toBe(false);
    expect(canSkip(check, REAL_USER_TEST_STUDENT)).toBe(false);
  });

  it('rate_limits: the user flag alone decides', () => {
    expect(canSkip('rate_limits', BOTH)).toBe(true);
    expect(canSkip('rate_limits', TEST_USER_REAL_STUDENT)).toBe(true);
    expect(canSkip('rate_limits', REAL_USER_TEST_STUDENT)).toBe(false);
    expect(canSkip('rate_limits', NONE)).toBe(false);
  });

  it('userOnlyFlags: a missing flag is a real user', () => {
    expect(userOnlyFlags(undefined)).toEqual(NONE);
    expect(userOnlyFlags(true)).toEqual(TEST_USER_REAL_STUDENT);
    expect(canSkip('join_window', userOnlyFlags(true))).toBe(false);
  });

  it('refuses any other check name', () => {
    expect(testCheckSchema.safeParse('auth').success).toBe(false);
    expect(testCheckSchema.safeParse('rls').success).toBe(false);
  });
});
