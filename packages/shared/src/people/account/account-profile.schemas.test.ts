import { describe, expect, it } from 'vitest';
import { accountProfileSchema } from './account-profile.schemas';

const profile = {
  id: '6f1c2b1e-3d4a-4b5c-8d9e-0a1b2c3d4e5f',
  full_name: 'Teacher One',
  email: 'one@example.com',
  phone_e164: '+201000000001',
  avatar_url: null,
  avatar_seed: '6f1c2b1e-3d4a-4b5c-8d9e-0a1b2c3d4e5f',
  role: { base: 'teacher', key: 'teacher', name_ar: 'معلم', name_en: 'Teacher' },
};

describe('accountProfileSchema (R-ACC-01)', () => {
  it('keeps every field of the answer the api sends today', () => {
    expect(accountProfileSchema.parse(profile)).toEqual(profile);
  });

  it('accepts a login with no email, phone, photo or role name', () => {
    const bare = { ...profile, email: null, phone_e164: null, avatar_seed: undefined };
    const role = { base: null, key: null, name_ar: null, name_en: null };
    expect(accountProfileSchema.safeParse({ ...bare, role }).success).toBe(true);
  });

  it('refuses a base role the catalog does not know', () => {
    const role = { ...profile.role, base: 'owner' };
    expect(accountProfileSchema.safeParse({ ...profile, role }).success).toBe(false);
  });

  it('refuses a stored phone that is not E.164', () => {
    expect(accountProfileSchema.safeParse({ ...profile, phone_e164: '0100' }).success).toBe(false);
  });
});
