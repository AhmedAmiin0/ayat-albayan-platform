import { describe, expect, it } from 'vitest';
import { accountSetupSchema, needsSetup } from './account-setup.js';

describe('teacher first-time setup (docs/46 A4)', () => {
  it('needs setup only for a teacher on a synthetic login', () => {
    expect(needsSetup({ role: 'teacher', email: 't-1@family.invalid' })).toBe(true);
    expect(needsSetup({ role: 'teacher', email: 'teacher@example.com' })).toBe(false);
    expect(needsSetup({ role: 'guardian', email: 'g-1@family.invalid' })).toBe(false);
    expect(needsSetup({ role: 'teacher', email: null })).toBe(false);
    expect(needsSetup(null)).toBe(false);
  });

  it('takes a real email (trimmed, lower-cased) and refuses the synthetic domain', () => {
    expect(accountSetupSchema.parse({ email: ' A@Example.com ', password: 'x' })).toEqual({
      email: 'a@example.com',
      password: 'x',
    });
    expect(
      accountSetupSchema.safeParse({ email: 't-1@family.invalid', password: 'x' }).success,
    ).toBe(false);
    expect(accountSetupSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(
      false,
    );
  });
});
