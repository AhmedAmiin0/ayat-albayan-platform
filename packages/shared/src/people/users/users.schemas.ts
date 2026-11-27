import { z } from 'zod';
import { isTimeZone, pageQuery, phoneE164 } from '@ab/core';
import { USER_ROLES } from '@ab/catalog';
import { isLinkedRole, needsExistingRecord, PASSWORD_MAX } from './validation';
import { isFamilyEmail } from './sign-in';

// Passwords are never part of a view or a log.

export const USER_STATUSES = ['active', 'disabled'] as const;
export const userStatusSchema = z.enum(USER_STATUSES);
export type UserStatus = z.infer<typeof userStatusSchema>;

/** set = the admin types it; generate = the API makes one, shown once; link = recovery link, shown once. */
export const CREDENTIAL_MODES = ['set', 'generate', 'link'] as const;
export type CredentialMode = (typeof CREDENTIAL_MODES)[number];

const blank = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? undefined : v);
// The family logins' synthetic domain (docs/30 §2) is the API's alone: never typed for a staff login.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email().max(254))
  .refine((v) => !isFamilyEmail(v), 'invalid_email');
const fullName = z.string().trim().min(2).max(120);
const zone = z.string().refine(isTimeZone, 'invalid_tz');
const locale = z.enum(['ar', 'en']);

export const usersListQuery = z.object({
  ...pageQuery({ size: 25 }),
  q: z.preprocess(blank, z.string().trim().max(100).optional()),
  role: z.preprocess(blank, z.enum(USER_ROLES).optional()),
  status: z.preprocess(blank, userStatusSchema.optional()),
});
export type UsersListQuery = z.output<typeof usersListQuery>;

export const LINK_KINDS = ['teacher', 'student', 'guardian'] as const;
export const linkKindSchema = z.enum(LINK_KINDS);
export type LinkKind = z.infer<typeof linkKindSchema>;
export const linkCandidatesQuery = z.object({
  kind: linkKindSchema,
  q: z.preprocess(blank, z.string().trim().max(100).optional()),
});

const newTeacher = z.object({
  display_name_ar: z.string().trim().min(2).max(120),
  display_name_en: z.preprocess(blank, z.string().trim().max(120).optional()),
  gender: z.enum(['male', 'female']),
});

interface LinkAsk {
  role?: (typeof USER_ROLES)[number] | undefined;
  linked_id?: string | undefined;
  new_teacher?: z.output<typeof newTeacher> | undefined;
}
type LinkRule = readonly [broken: (v: LinkAsk) => boolean, message: string, path?: string];

const asksTeacher = (v: LinkAsk): boolean => v.role === 'teacher';
const namesRecord = (v: LinkAsk): boolean =>
  v.linked_id !== undefined || v.new_teacher !== undefined;
const backed = (v: LinkAsk): boolean => v.role !== undefined && isLinkedRole(v.role);
const needsLinkedId = (v: LinkAsk): boolean => v.role !== undefined && needsExistingRecord(v.role);

/** A login of a record-backed role belongs to one record: an existing row, or a new teacher. */
const LINK_RULES: readonly LinkRule[] = [
  [(v) => needsLinkedId(v) && !v.linked_id, 'link_required'],
  [(v) => asksTeacher(v) && !namesRecord(v), 'link_required'],
  [(v) => asksTeacher(v) && !!v.linked_id && !!v.new_teacher, 'link_or_new', 'new_teacher'],
  [(v) => namesRecord(v) && !backed(v), 'link_not_allowed'],
  [(v) => !!v.new_teacher && backed(v) && !asksTeacher(v), 'link_not_allowed'],
];

/** POST /users and PATCH /users/:id: the record a teacher, student or guardian role needs. */
function refineLink(v: LinkAsk, ctx: z.RefinementCtx): void {
  LINK_RULES.filter(([broken]) => broken(v)).forEach(([, message, path = 'linked_id']) =>
    ctx.addIssue({ code: 'custom', path: [path], message }),
  );
}

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
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: 'custom', path: [path], message });
    if (v.credential === 'set' && !v.password) issue('password', 'password_required');
    refineLink(v, ctx);
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
    /** With a new teacher / student / guardian role: the existing row to give this login. */
    linked_id: z.uuid().optional(),
    /** With the new teacher role and no row yet: create it. */
    new_teacher: newTeacher.optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), 'empty_update')
  .superRefine(refineLink);
export type UserUpdate = z.output<typeof userUpdateSchema>;

export const userDisableSchema = z.object({
  reason: z.preprocess(blank, z.string().trim().max(500).optional()),
});
export type UserDisable = z.output<typeof userDisableSchema>;

export const passwordResetSchema = z
  .object({
    credential: z.enum(CREDENTIAL_MODES).default('generate'),
    password: z.string().max(PASSWORD_MAX).optional(),
  })
  .refine((v) => v.credential !== 'set' || !!v.password, {
    path: ['password'],
    message: 'password_required',
  });
export type PasswordReset = z.output<typeof passwordResetSchema>;
