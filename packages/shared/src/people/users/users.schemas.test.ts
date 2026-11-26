import { describe, expect, it } from 'vitest';
import {
  LINK_KINDS,
  linkKindSchema,
  passwordResetSchema,
  userCreateSchema,
  userUpdateSchema,
  usersListQuery,
} from './users.schemas';

const base = { email: ' Ali@Example.com ', full_name: 'علي أحمد', role: 'admin' as const };
const ID = '0b6a0f9e-4a3a-4c1c-8c2e-5d7a3b1f9e11';

describe('userCreateSchema', () => {
  it('normalises the email and phone and defaults to a generated password', () => {
    const r = userCreateSchema.parse({ ...base, phone_e164: '0501234567' });
    expect(r).toMatchObject({ email: 'ali@example.com', phone_e164: '+966501234567', credential: 'generate' });
  });
  it('refuses the family logins\' synthetic domain (docs/30 §2)', () => {
    expect(userCreateSchema.safeParse({ ...base, email: 'g-1@Family.Invalid' }).success).toBe(false);
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

const teacher = { display_name_ar: 'أحمد', gender: 'male' as const };
const ok = (r: { success: boolean }) => r.success;
const message = (r: { error?: { issues: { message: string }[] } }) => r.error?.issues[0]?.message;

describe('userCreateSchema: the linked record', () => {
  it('refuses a new teacher on any other role', () => {
    const r = userCreateSchema.safeParse({ ...base, role: 'student', linked_id: ID, new_teacher: teacher });
    expect(message(r)).toBe('link_not_allowed');
  });
});

describe('userUpdateSchema: the record of a new teacher, student or guardian role', () => {
  it('accepts teacher with an existing or a new record, student and guardian with an existing one', () => {
    expect(ok(userUpdateSchema.safeParse({ role: 'teacher', linked_id: ID }))).toBe(true);
    expect(userUpdateSchema.parse({ role: 'teacher', new_teacher: teacher })).toEqual({ role: 'teacher', new_teacher: teacher });
    expect(ok(userUpdateSchema.safeParse({ role: 'student', linked_id: ID }))).toBe(true);
    expect(ok(userUpdateSchema.safeParse({ role: 'guardian', linked_id: ID }))).toBe(true);
  });
  it('needs the record: link_required', () => {
    expect(message(userUpdateSchema.safeParse({ role: 'teacher' }))).toBe('link_required');
    expect(message(userUpdateSchema.safeParse({ role: 'student' }))).toBe('link_required');
    expect(message(userUpdateSchema.safeParse({ role: 'guardian', new_teacher: teacher }))).toBe('link_required');
  });
  it('a teacher is either existing or new, never both: link_or_new', () => {
    expect(message(userUpdateSchema.safeParse({ role: 'teacher', linked_id: ID, new_teacher: teacher }))).toBe('link_or_new');
  });
  it('refuses a record without a record-backed role: link_not_allowed', () => {
    expect(message(userUpdateSchema.safeParse({ linked_id: ID }))).toBe('link_not_allowed');
    expect(message(userUpdateSchema.safeParse({ role: 'sales', new_teacher: teacher }))).toBe('link_not_allowed');
    expect(message(userUpdateSchema.safeParse({ role_id: ID, linked_id: ID }))).toBe('link_not_allowed');
    expect(message(userUpdateSchema.safeParse({ role: 'student', linked_id: ID, new_teacher: teacher }))).toBe('link_not_allowed');
  });
  it('refuses a malformed record id', () => {
    expect(ok(userUpdateSchema.safeParse({ role: 'student', linked_id: 'nope' }))).toBe(false);
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

describe('linkKindSchema', () => {
  it('names the roles whose login links to a record', () => {
    expect(linkKindSchema.options).toEqual([...LINK_KINDS]);
    expect(linkKindSchema.validate('admin')).toBe(false);
  });

  it('a link is refused on a role without a record and kept on one with', () => {
    const linked = { ...base, linked_id: ID };
    const admin = userCreateSchema.safeParse(linked);
    expect(admin.error?.issues.map((i) => i.message)).toEqual(['link_not_allowed']);
    expect(userCreateSchema.parse({ ...linked, role: 'guardian' }).linked_id).toBe(ID);
  });
});
