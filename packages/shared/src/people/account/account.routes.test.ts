import { describe, expect, it } from 'vitest';
import { accountSetupRoutes } from './account.routes';

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
