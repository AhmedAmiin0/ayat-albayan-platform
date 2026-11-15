import type { AccountProfile } from '@ab/shared';

// «حسابي» fixtures (R-ACC-01): GET /me/profile as the API answers it.

export const profileFixture: AccountProfile = {
  id: 'u1',
  full_name: 'Huda Salem',
  email: 'huda@example.com',
  phone_e164: '+966501234567',
  avatar_url: null,
  role: { base: 'admin', key: 'admin', name_ar: 'Admin', name_en: 'Admin' },
};

/** apiFetch for a screen that also reads its own data: /me/profile gets the profile, the rest `other`. */
export const fetchWithProfile =
  (other: unknown, profile: AccountProfile = profileFixture) =>
  async (url: string): Promise<unknown> =>
    url === '/me/profile' ? profile : other;

/** The /me write as the API answers it: the fixture with `over` applied. */
export const savedProfile = (over: Partial<AccountProfile>): AccountProfile => ({ ...profileFixture, ...over });
