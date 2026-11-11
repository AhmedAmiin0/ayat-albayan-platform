import { ApiError } from '@ab/client-core';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { setupErrorText, setupFormProblem } from './setup-errors';

const S = t.teacherAuth.setup;

describe('first-time setup words (docs/46 A4)', () => {
  it('maps the API refusals, anything else is the generic error', () => {
    expect(setupErrorText(new ApiError(409, { code: 'email_taken' }))).toBe(S.errors.email_taken);
    expect(setupErrorText(new ApiError(409, { code: 'setup_done' }))).toBe(S.errors.setup_done);
    expect(setupErrorText(new ApiError(400, { code: 'password_too_short', min: 8 }))).toBe(
      t.users.errors.password_too_short,
    );
    expect(setupErrorText(new ApiError(500, { code: 'boom' }))).toBe(t.common.error);
    expect(setupErrorText(new Error('offline'))).toBe(t.common.error);
  });

  it('checks the email (never the synthetic domain) and the two passwords', () => {
    const ok = {
      email: 'teacher@example.com',
      password: 'Long-enough-1',
      confirm: 'Long-enough-1',
    };
    expect(setupFormProblem(ok)).toBeUndefined();
    expect(setupFormProblem({ ...ok, email: 't-1@family.invalid' })).toBe(S.errors.invalid_email);
    expect(setupFormProblem({ ...ok, email: 'nope' })).toBe(S.errors.invalid_email);
    expect(setupFormProblem({ ...ok, confirm: 'other-one-1' })).toBe(t.familyAuth.passwordsDiffer);
  });
});
