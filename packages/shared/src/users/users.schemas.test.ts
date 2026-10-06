import { describe, expect, it } from 'vitest';
import { passwordResetSchema, userCreateSchema, userUpdateSchema, usersListQuery } from './users.schemas.js';

const base = { email: ' Ali@Example.com ', full_name: 'علي أحمد', role: 'admin' as const };
const ID = '0b6a0f9e-4a3a-4c1c-8c2e-5d7a3b1f9e11';

describe('userCreateSchema', () => {
  it('normalises the email and phone and defaults to a generated password', () => {
    const r = userCreateSchema.parse({ ...base, phone_e164: '0501234567' });
    expect(r).toMatchObject({ email: 'ali@example.com', phone_e164: '+966501234567', credential: 'generate' });
  });
  it('needs the typed password only in set mode', () => {
    expect(userCreateSchema.safeParse({ ...base, credential: 'set' }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, credential: 'set', password: 'pass-12345' }).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...base, credential: 'link' }).success).toBe(true);
  });
  it('requires an existing student or guardian row, but a teacher may be new', () => {
    expect(userCreateSchema.safeParse({ ...base, role: 'student' }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, role: 'guardian', linked_id: ID }).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...base, role: 'teacher' }).success).toBe(false);
    const t = { display_name_ar: 'أحمد', gender: 'male' as const };
    expect(userCreateSchema.safeParse({ ...base, role: 'teacher', new_teacher: t }).success).toBe(true);
    expect(userCreateSchema.safeParse({ ...base, role: 'teacher', linked_id: ID, new_teacher: t }).success).toBe(false);
  });
  it('refuses a link on a role without a record', () => {
    expect(userCreateSchema.safeParse({ ...base, role: 'sales', linked_id: ID }).success).toBe(false);
  });
  it('refuses a bad email or timezone', () => {
    expect(userCreateSchema.safeParse({ ...base, email: 'nope' }).success).toBe(false);
    expect(userCreateSchema.safeParse({ ...base, tz: 'Mars/Base' }).success).toBe(false);
  });
});

describe('userUpdateSchema / passwordResetSchema / usersListQuery', () => {
  it('refuses an empty update and keeps only what was sent', () => {
    expect(userUpdateSchema.safeParse({}).success).toBe(false);
    expect(userUpdateSchema.parse({ full_name: 'علي أحمد' })).toEqual({ full_name: 'علي أحمد' });
    expect(userUpdateSchema.parse({ role_id: null })).toEqual({ role_id: null });
  });
  it('needs a password in set mode', () => {
    expect(passwordResetSchema.safeParse({ credential: 'set' }).success).toBe(false);
    expect(passwordResetSchema.parse({})).toEqual({ credential: 'generate' });
  });
  it('treats blank filters as unset and pages from 1', () => {
    expect(usersListQuery.parse({ q: ' ', role: '', status: 'disabled' })).toEqual({ page: 1, pageSize: 25, status: 'disabled' });
    expect(usersListQuery.safeParse({ role: 'owner' }).success).toBe(false);
  });
});
