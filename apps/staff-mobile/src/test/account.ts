import type { AccountProfile } from '@ab/shared';

// Account fixtures (R-ACC-01).

export const profileFixture: AccountProfile = {
  id: '6f1c2b8e-0d0a-4c8e-9a51-2a6b0f6d9e11',
  full_name: 'Huda Salem',
  email: 'huda@example.com',
  phone_e164: '+966501234567',
  avatar_url: null,
  role: { base: 'admin', key: 'admin', name_ar: 'Admin', name_en: 'Admin' },
};

/** apiFetch for a screen with its own data: /me/profile gets the profile, the rest `other`. */
export const fetchWithProfile =
  (other: unknown, profile: AccountProfile = profileFixture) =>
  async (url: string): Promise<unknown> =>
    url === '/me/profile' ? profile : other;

/** The /me write as the API answers it: the fixture with `over` applied. */
export const savedProfile = (over: Partial<AccountProfile>): AccountProfile => ({
  ...profileFixture,
  ...over,
});
