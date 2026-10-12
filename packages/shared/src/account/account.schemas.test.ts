import { describe, expect, it } from 'vitest';
import { avatarSetSchema, avatarUploadSchema, emailChangeSchema, passwordChangeSchema, profileUpdateSchema } from './account.schemas.js';
import { initialsOf } from './account.views.js';

// «حسابي» bodies (R-ACC-02..05).

describe('profileUpdateSchema (R-ACC-02)', () => {
  it('trims the name and keeps it within 2-80 characters', () => {
    expect(profileUpdateSchema.parse({ full_name: '  هدى علي ' })).toEqual({ full_name: 'هدى علي' });
    expect(profileUpdateSchema.safeParse({ full_name: 'ه' }).error?.issues[0]?.message).toBe('name_too_short');
    expect(profileUpdateSchema.safeParse({ full_name: 'ه'.repeat(81) }).error?.issues[0]?.message).toBe('name_too_long');
  });
  it('normalises the phone to E.164 and requires the current password with it', () => {
    expect(profileUpdateSchema.parse({ phone_e164: '00966 50 123 4567', current_password: 'x' }).phone_e164).toBe('+966501234567');
    const r = profileUpdateSchema.safeParse({ phone_e164: '+966501234567' });
    expect(r.error?.issues.map((i) => [i.path.join('.'), i.message])).toEqual([['current_password', 'password_required']]);
  });
  it('strips role, role_id and disabled_*; nothing else left is an empty update', () => {
    expect(profileUpdateSchema.parse({ full_name: 'هدى علي', role: 'admin', role_id: null })).toEqual({ full_name: 'هدى علي' });
    expect(profileUpdateSchema.safeParse({ role: 'admin', disabled_at: null }).error?.issues[0]?.message).toBe('empty_update');
  });
});

describe('email, password and avatar bodies (R-ACC-03..05)', () => {
  it('lower-cases the email and needs the current password', () => {
    expect(emailChangeSchema.parse({ email: ' A@B.Test ', current_password: 'p' }).email).toBe('a@b.test');
    expect(emailChangeSchema.safeParse({ email: 'a@b.test', current_password: '' }).success).toBe(false);
    expect(emailChangeSchema.safeParse({ email: 'nope', current_password: 'p' }).success).toBe(false);
  });
  it('caps the new password at 72 and needs the current one', () => {
    expect(passwordChangeSchema.safeParse({ current_password: 'p', new_password: 'x'.repeat(73) }).success).toBe(false);
    expect(passwordChangeSchema.safeParse({ new_password: 'long-enough-1' }).success).toBe(false);
  });
  it('accepts jpeg/png/webp up to 2 MB and a path', () => {
    expect(avatarUploadSchema.safeParse({ mime: 'image/jpeg', size: 2 * 1024 * 1024 }).success).toBe(true);
    expect(avatarUploadSchema.safeParse({ mime: 'image/gif', size: 10 }).error?.issues[0]?.message).toBe('avatar_type');
    expect(avatarSetSchema.safeParse({ path: '' }).success).toBe(false);
  });
});

describe('initialsOf', () => {
  it('takes the first letter of the first two words', () => {
    expect(initialsOf('هدى علي أحمد')).toBe('هع');
    expect(initialsOf('  Sara ')).toBe('S');
    expect(initialsOf('')).toBe('');
  });
});
