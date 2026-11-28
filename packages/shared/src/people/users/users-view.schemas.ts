import { userRoleSchema } from '@ab/catalog';
import { pageOf } from '@ab/core';
import { z } from 'zod';
import { linkKindSchema, userStatusSchema } from './users.schemas';

// Passwords are never part of a view or a log; a credential is shown once, in a create or reset.

/** The teacher / student / guardian row a login belongs to. */
export const linkedRecordSchema = z.object({
  kind: linkKindSchema,
  id: z.string(),
  name: z.string(),
  /** Students only: AB-nnnn. */
  code: z.string().nullable(),
});
export type LinkedRecord = z.infer<typeof linkedRecordSchema>;

export const userViewSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  full_name: z.string(),
  phone_e164: z.string().nullable(),
  role: userRoleSchema,
  /** The held role (the system role's id when none is custom). */
  role_id: z.string().nullable(),
  role_key: z.string().nullable(),
  status: userStatusSchema,
  disabled_at: z.string().nullable(),
  last_sign_in_at: z.string().nullable(),
  created_at: z.string(),
  linked: linkedRecordSchema.nullable(),
  /** A teacher's sign-in username (docs/30); null / absent = none. */
  username: z.string().nullable().optional(),
  /** A test account (docs/56); absent from an older API means real. */
  is_test: z.boolean().optional(),
  /** A staff photo, a short-lived signed URL; null = initials (students and guardians always). */
  avatar_url: z.string().nullable().optional(),
  /** What the initials tone hashes: the linked teacher's id, else the profile's. */
  avatar_seed: z.string().optional(),
});
export type UserView = z.infer<typeof userViewSchema>;

/** GET /users/:id: the list row plus what the edit panel needs. */
export const userDetailSchema = userViewSchema.extend({
  locale: z.string(),
  tz: z.string(),
  disabled_reason: z.string().nullable(),
});
export type UserDetail = z.infer<typeof userDetailSchema>;

export const userPageSchema = pageOf(userViewSchema);
export type UserPage = z.infer<typeof userPageSchema>;

export const issuedCredentialSchema = z.object({
  kind: z.enum(['password', 'link']),
  value: z.string(),
});
export type IssuedCredential = z.infer<typeof issuedCredentialSchema>;

export const userWithCredentialSchema = z.object({
  user: userDetailSchema,
  credential: issuedCredentialSchema.nullable(),
});
export type UserWithCredential = z.infer<typeof userWithCredentialSchema>;

/** A record without a login yet, offered by the «link to» pickers. */
export type LinkCandidate = z.infer<typeof linkedRecordSchema>;

/** A role the user form may offer; `assignable` = the actor holds every grant of it. */
export const userRoleOptionSchema = z.object({
  id: z.string(),
  key: z.string(),
  name_ar: z.string(),
  name_en: z.string().nullable(),
  base_role: userRoleSchema,
  is_system: z.boolean(),
  assignable: z.boolean(),
});
export type UserRoleOption = z.infer<typeof userRoleOptionSchema>;

/** One table (and count) that keeps a user from being deleted. */
export const userReferenceSchema = z.object({
  table: z.string(),
  column: z.string(),
  count: z.number().int(),
});
export type UserReference = z.infer<typeof userReferenceSchema>;
