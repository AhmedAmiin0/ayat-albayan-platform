import { emailChangeSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { accountKit, ME, PASSWORD } from './account.fakes';

describe('PUT /me/email (R-ACC-03)', () => {
  it('changes the login email after the password check, confirmed at once', async () => {
    const kit = accountKit();
    const body = emailChangeSchema.parse({ email: ' New@Example.TEST ', current_password: PASSWORD });
    const view = await kit.account.changeEmail(ME, body);
    expect(view.email).toBe('new@example.test');
    expect(kit.auth.updates).toEqual([{ id: 'user-1', patch: { email: 'new@example.test' } }]);
  });

  it('400 wrong_password changes nothing', async () => {
    const kit = accountKit();
    await expect(kit.account.changeEmail(ME, { email: 'x@example.test', current_password: 'bad' })).rejects.toMatchObject({
      response: { code: 'wrong_password' },
    });
    expect(kit.auth.updates).toEqual([]);
  });

  it('409 email_taken when another login has it', async () => {
    const kit = accountKit();
    kit.auth.takenEmails.add('taken@example.test');
    await expect(kit.account.changeEmail(ME, { email: 'taken@example.test', current_password: PASSWORD })).rejects.toMatchObject({
      response: { code: 'email_taken' },
    });
  });

  it('refuses a malformed email or a missing password', () => {
    expect(emailChangeSchema.safeParse({ email: 'nope', current_password: PASSWORD }).success).toBe(false);
    expect(emailChangeSchema.safeParse({ email: 'a@example.test', current_password: '' }).success).toBe(false);
  });
});
