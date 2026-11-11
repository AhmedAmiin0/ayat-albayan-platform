import { accountSetupSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { accountKit, ME } from './account.fakes';

const SYNTHETIC = 't-t1@family.invalid';
const body = accountSetupSchema.parse({ email: 'Teacher@Example.test', password: 'Brand-new-1' });

function setupKit(email = SYNTHETIC) {
  const kit = accountKit();
  kit.auth.emails.set('user-1', email);
  return kit;
}

describe('PUT /me/setup (docs/46 A4)', () => {
  it('sets the real email and the password together, keeps this session, ends the others', async () => {
    const kit = setupKit();
    await kit.setup.setup({ ...ME, sessionId: 's-1' }, body);
    expect(kit.auth.updates).toEqual([
      { id: 'user-1', patch: { email: 'teacher@example.test', password: 'Brand-new-1' } },
    ]);
    expect(kit.auth.revoked).toEqual([{ userId: 'user-1', keep: 's-1' }]);
  });

  it('409 setup_done once the email is real, and for any role but teacher', async () => {
    const done = setupKit('teacher@example.test');
    await expect(done.setup.setup(ME, body)).rejects.toMatchObject({
      response: { code: 'setup_done' },
    });
    const guardian = setupKit('g-1@family.invalid');
    const row = guardian.store.rows.get('user-1');
    if (row) row.role = { ...row.role, base: 'guardian' };
    await expect(guardian.setup.setup(ME, body)).rejects.toMatchObject({
      response: { code: 'setup_done' },
    });
    expect([...done.auth.updates, ...guardian.auth.updates]).toEqual([]);
  });

  it('400 for a short password before anything is read; 409 email_taken from the Admin API', async () => {
    const kit = setupKit();
    await expect(kit.setup.setup(ME, { ...body, password: 'short' })).rejects.toMatchObject({
      response: { code: 'password_too_short' },
    });
    kit.auth.takenEmails.add('teacher@example.test');
    await expect(kit.setup.setup(ME, body)).rejects.toMatchObject({
      response: { code: 'email_taken' },
    });
    expect(kit.auth.revoked).toEqual([]);
  });
});
