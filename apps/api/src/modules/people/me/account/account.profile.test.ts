import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { accountKit, ME } from './account.fakes';

describe('GET /me/profile (R-ACC-01)', () => {
  it('returns the caller’s name, email from Auth, phone, role label and no photo', async () => {
    const kit = accountKit();
    expect(await kit.account.profile(ME)).toEqual({
      id: 'user-1',
      full_name: 'Huda',
      email: 'old@example.test',
      phone_e164: null,
      avatar_url: null,
      role: { base: 'teacher', key: 'teacher', name_ar: 'teacher-ar', name_en: 'Teacher' },
    });
  });

  it('signs a short-lived URL for a stored photo', async () => {
    const kit = accountKit();
    await kit.store.update(ME.id, { avatar_path: 'user-1/avatar-1.png' });
    expect((await kit.account.profile(ME)).avatar_url).toBe('https://storage.test/signed/user-1/avatar-1.png');
  });

  it('falls back to the token email when Auth has none, and 404s without a profile', async () => {
    const kit = accountKit();
    kit.auth.emails.clear();
    expect((await kit.account.profile(ME)).email).toBe('old@example.test');
    await expect(kit.account.profile({ ...ME, id: 'nobody' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
