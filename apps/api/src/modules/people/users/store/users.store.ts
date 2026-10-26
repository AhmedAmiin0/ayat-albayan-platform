import type { LinkCandidate, LinkedRecord, LinkKind, UserRole, UsersListQuery } from '@ab/shared';
import type { ProfileRecord } from '../../roles/roles.store';

// What the users module needs from the DB and from the Supabase Auth Admin API. UsersQueries and
// SupabaseAuthAdmin implement them; the unit tests use the in-memory fakes (users.fakes.ts).

/** One login as the directory shows it. */
export interface UserRow {
  id: string;
  email: string | null;
  full_name: string;
  phone_e164: string | null;
  role: UserRole;
  role_id: string | null;
  role_key: string | null;
  disabled_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  linked: LinkedRecord | null;
  /** Detail only (the list RPC does not return them). */
  locale?: string;
  tz?: string;
  disabled_reason?: string | null;
}

/** A profile as the safety rules see it. */
export interface StaffProfile extends ProfileRecord {
  disabled_at: string | null;
}

export interface NewProfile {
  id: string;
  role: UserRole;
  role_id: string | null;
  full_name: string;
  phone_e164: string | null;
  locale: string;
  tz: string;
}

export type ProfilePatch = Partial<Omit<NewProfile, 'id'>>;

export interface NewTeacher {
  profile_id: string;
  display_name_ar: string;
  display_name_en: string | null;
  gender: 'male' | 'female';
  phone_e164: string | null;
  tz: string;
}

/** A table that references the user; `link` rows are cleared by the delete, `history` rows block it. */
export interface RefRow {
  ref_table: string;
  ref_column: string;
  kind: 'link' | 'history';
  n: number;
}

export interface LinkTarget {
  id: string;
  name: string;
  hasLogin: boolean;
}

export interface UserStore {
  list(query: UsersListQuery): Promise<{ rows: UserRow[]; total: number }>;
  get(id: string): Promise<UserRow | null>;
  /** Every profile that can hold permissions (not guardians / students). */
  staff(): Promise<StaffProfile[]>;
  profile(id: string): Promise<StaffProfile | null>;
  upsertProfile(row: NewProfile): Promise<void>;
  /** Role / role_id changes and disabling are guarded in the DB too (migration 287): 409 last_admin. */
  updateProfile(id: string, patch: ProfilePatch): Promise<void>;
  setDisabled(id: string, value: { by: string; reason: string | null } | null): Promise<void>;
  /** Deletes the profile's browser push subscriptions (a disabled account gets nothing; app tokens stay). */
  forgetBrowsers(id: string): Promise<void>;
  /** Is the phone on another profile or on a teacher record that is not this profile's? */
  phoneTaken(phone: string, exceptProfile: string): Promise<boolean>;
  linkTarget(kind: LinkKind, id: string): Promise<LinkTarget | null>;
  /** Sets profile_id only while it is still null; false = somebody linked it first. */
  link(kind: LinkKind, id: string, profileId: string): Promise<boolean>;
  createTeacher(row: NewTeacher): Promise<string>;
  /** The linked teacher's display name / phone follow the profile. */
  syncTeacher(profileId: string, patch: { display_name_ar?: string; phone_e164?: string | null }): Promise<void>;
  candidates(kind: LinkKind, q: string | undefined): Promise<LinkCandidate[]>;
  references(id: string): Promise<RefRow[]>;
}

export interface AuthPatch {
  email?: string;
  password?: string;
  fullName?: string;
  /** Mark the email confirmed (an adopted login). */
  confirmEmail?: boolean;
  /** true = ban for good (until enabled again), false = lift the ban. */
  banned?: boolean;
}

export interface AuthAdmin {
  findIdByEmail(email: string): Promise<string | null>;
  /** Without a password the login is passwordless until a recovery link is used. */
  create(input: { email: string; password?: string; fullName: string }): Promise<string>;
  update(id: string, patch: AuthPatch): Promise<void>;
  /** Deletes the login; its profile goes with it and the linked records' profile_id are set null by their FKs. */
  remove(id: string): Promise<void>;
  recoveryLink(email: string): Promise<string>;
  revokeSessions(id: string): Promise<void>;
}

export const USER_STORE = Symbol('USER_STORE');
export const AUTH_ADMIN = Symbol('AUTH_ADMIN');
export const USERS_CONFIG = Symbol('USERS_CONFIG');

export interface UsersConfig {
  passwordMinLength: number;
  /** Where a recovery link lands (the web's /set-password). */
  setPasswordUrl: string;
}
