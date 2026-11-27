import { describe, expect, it } from 'vitest';
import { accountRoutes, accountSetupRoutes } from './account.routes';

describe('accountSetupRoutes (docs/46 A4)', () => {
  it('keeps the path the api serves today and answers nothing', () => {
    const { setup } = accountSetupRoutes;
    expect(`${setup.method} ${setup.path}`).toBe('PUT /me/setup');
    expect(setup.response).toBe('empty');
  });

  it('refuses a synthetic family email', () => {
    const body = { email: 't-1@family.invalid', password: 'x' };
    expect(accountSetupRoutes.setup.body.safeParse(body).success).toBe(false);
  });
});

describe('accountRoutes (R-ACC-01..05)', () => {
  it('keeps the paths the api serves today, no id in any of them', () => {
    const lines = Object.values(accountRoutes).map((r) => `${r.method} ${r.path}`);
    expect(lines).toEqual([
      'PATCH /me/locale',
      'GET /me/profile',
      'PATCH /me/profile',
      'PUT /me/email',
      'PUT /me/password',
      'POST /me/avatar/upload-url',
      'PUT /me/avatar',
      'DELETE /me/avatar',
    ]);
  });

  it('answers nothing to a password change', () => {
    expect(accountRoutes.password.response).toBe('empty');
  });

  it('strips a role from a profile change', () => {
    const body = accountRoutes.updateProfile.body.parse({
      full_name: 'Teacher One',
      role: 'admin',
    });
    expect(body).toEqual({ full_name: 'Teacher One' });
  });

  it('refuses an avatar type the bucket does not take', () => {
    const body = { mime: 'image/gif', size: 10 };
    expect(accountRoutes.avatarUploadUrl.body.safeParse(body).success).toBe(false);
  });
});
