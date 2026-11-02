import { z } from 'zod';
import { isTimeZone, phoneE164 } from '@ab/core';
import { USER_ROLES } from '@ab/catalog';
import { needsExistingRecord, PASSWORD_MAX } from './validation.js';
import { isFamilyEmail } from './sign-in.js';

// «المستخدمون»: the bodies and query of /users (owner, 2026-10-06). The API answers with the views
// in users.views.ts. Passwords are never part of a view or a log.

export const USER_STATUSES = ['active', 'disabled'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

/** set = the admin types it; generate = the API makes one, shown once; link = recovery link, shown once. */
export const CREDENTIAL_MODES = ['set', 'generate', 'link'] as const;
export type CredentialMode = (typeof CREDENTIAL_MODES)[number];

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
// The family logins' synthetic domain (docs/30 §2) is the API's alone: never typed for a staff login.
const email = z.string().trim().toLowerCase().pipe(z.email().max(254)).refine((v) => !isFamilyEmail(v), 'invalid_email');
const fullName = z.string().trim().min(2).max(120);
const zone = z.string().refine(isTimeZone, 'invalid_tz');
const locale = z.enum(['ar', 'en']);

export const usersListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.preprocess(blank, z.string().trim().max(100).optional()),
  role: z.preprocess(blank, z.enum(USER_ROLES).optional()),
  status: z.preprocess(blank, z.enum(USER_STATUSES).optional()),
});
export type UsersListQuery = z.output<typeof usersListQuery>;

export const LINK_KINDS = ['teacher', 'student', 'guardian'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export const linkCandidatesQuery = z.object({
  kind: z.enum(LINK_KINDS),
  q: z.preprocess(blank, z.string().trim().max(100).optional()),
});

const newTeacher = z.object({
  display_name_ar: z.string().trim().min(2).max(120),
  display_name_en: z.preprocess(blank, z.string().trim().max(120).optional()),
  gender: z.enum(['male', 'female']),
});

export const userCreateSchema = z
  .object({
    email,
    full_name: fullName,
    phone_e164: z.preprocess(blank, phoneE164.optional()),
    role: z.enum(USER_ROLES),
    role_id: z.uuid().optional(),
    locale: locale.optional(),
    tz: zone.optional(),
    credential: z.enum(CREDENTIAL_MODES).default('generate'),
    password: z.string().max(PASSWORD_MAX).optional(),
    /** teacher / student / guardian: the existing row to give a login. */
    linked_id: z.uuid().optional(),
    /** teacher without a row yet: create it. */
    new_teacher: newTeacher.optional(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (v.credential === 'set' && !v.password) issue('password', 'password_required');
    if (needsExistingRecord(v.role) && !v.linked_id) issue('linked_id', 'link_required');
    if (v.role === 'teacher' && !v.linked_id && !v.new_teacher) issue('linked_id', 'link_required');
    if (v.role === 'teacher' && v.linked_id && v.new_teacher) issue('new_teacher', 'link_or_new');
    if (!['teacher', 'student', 'guardian'].includes(v.role) && (v.linked_id || v.new_teacher)) issue('linked_id', 'link_not_allowed');
  });
export type UserCreate = z.output<typeof userCreateSchema>;

export const userUpdateSchema = z
  .object({
    email: email.optional(),
    full_name: fullName.optional(),
    phone_e164: z.preprocess(blank, phoneE164.nullable().optional()),
    locale: locale.optional(),
    tz: zone.optional(),
    role: z.enum(USER_ROLES).optional(),
    /** A custom role of the base role; null = the base role's system role. */
    role_id: z.uuid().nullable().optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'empty_update');
export type UserUpdate = z.output<typeof userUpdateSchema>;

export const userDisableSchema = z.object({ reason: z.preprocess(blank, z.string().trim().max(500).optional()) });
export type UserDisable = z.output<typeof userDisableSchema>;

export const passwordResetSchema = z
  .object({ credential: z.enum(CREDENTIAL_MODES).default('generate'), password: z.string().max(PASSWORD_MAX).optional() })
  .refine((v) => v.credential !== 'set' || !!v.password, { path: ['password'], message: 'password_required' });
export type PasswordReset = z.output<typeof passwordResetSchema>;
