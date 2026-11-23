import { z } from 'zod';

// Test accounts: the four checks a test account may skip, and on whose flag.
// Never in this table: sign-in, scope, RLS, permissions, payments. Pure.

export const testCheckSchema = z.enum(['watermark', 'rate_limits', 'join_window', 'screen_capture']);
export type TestCheck = z.infer<typeof testCheckSchema>;

/**
 * Whose flag a check needs: `user` = the signed-in profile's alone (rate limits have no student);
 * `user_and_student` = the profile's AND the content's student's (the double condition).
 */
export type TestScope = 'user' | 'user_and_student';

export const TEST_BYPASS: Readonly<Record<TestCheck, TestScope>> = {
  watermark: 'user_and_student',
  rate_limits: 'user',
  join_window: 'user_and_student',
  screen_capture: 'user_and_student',
};

/** The two flags, read by the server from the database (never from the client or the token). */
export const testFlagsSchema = z.object({
  userIsTest: z.boolean(),
  studentIsTest: z.boolean(),
});
export type TestFlags = z.infer<typeof testFlagsSchema>;

const PASSES: Readonly<Record<TestScope, (flags: TestFlags) => boolean>> = {
  user: (flags) => flags.userIsTest,
  user_and_student: (flags) => flags.userIsTest && flags.studentIsTest,
};

/** May this check be skipped? A real user, or a test user on a real student, never skips. */
export function canSkip(check: TestCheck, flags: TestFlags): boolean {
  return PASSES[TEST_BYPASS[check]](flags);
}

/** The flags of a call without a student (rate limits): the profile's own flag only. */
export const userOnlyFlags = (userIsTest: boolean | undefined): TestFlags => ({
  userIsTest: userIsTest === true,
  studentIsTest: false,
});
