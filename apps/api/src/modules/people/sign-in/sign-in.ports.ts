import type { PasswordSession, CodeSession, UserRole } from '@ab/shared';

// Family accounts (docs/30): what the sign-in flows read and write, as ports so the flows are tested
// on in-memory fakes (sign-in.fakes.ts) and run on Supabase (codes.queries, subjects.queries, auth-gate).

export type CodePurpose = 'sign_in' | 'reset_password' | 'set_password';
export type SubjectKind = 'guardian' | 'student' | 'profile';

/** Who a code is for: guardians.id, students.id or profiles.id (staff). */
export interface Subject {
  kind: SubjectKind;
  id: string;
}

export interface NewCode {
  purpose: CodePurpose;
  subject: Subject;
  phone: string;
  hash: string;
  maxAttempts: number;
  expiresAt: Date;
}

export interface LiveCode {
  id: string;
  purpose: CodePurpose;
  phone: string;
}

/** login_codes of one phone in the last 24 hours (the per-phone limits, counted in the database). */
export interface PhoneStats {
  sentLast15Min: number;
  sentLastDay: number;
  failedLastDay: number;
}

export interface CodeStore {
  insert(row: NewCode): Promise<string>;
  /** The newest code of the subject for these purposes, whatever its state (older ones never count). */
  latest(subject: Subject, purposes: readonly CodePurpose[]): Promise<LiveCode | null>;
  /** Counts one attempt on a live code and returns its hash; null = expired, spent or out of attempts. */
  take(id: string): Promise<string | null>;
  /** Spends the code: true for the first caller only. */
  spend(id: string): Promise<boolean>;
  delivered(id: string, error: string | null): Promise<void>;
  phoneStats(phone: string, now: Date): Promise<PhoneStats>;
}

export interface GuardianRec {
  id: string;
  name: string;
  phone: string;
  tz: string;
  profileId: string | null;
}

export interface StudentRec {
  id: string;
  name: string;
  tz: string;
  profileId: string | null;
  /** The guardian's phone: where the student's codes go. */
  guardianPhone: string;
}

export interface ProfileRec {
  id: string;
  role: UserRole;
  disabled: boolean;
  /** profiles.phone_e164, else the linked teacher row's phone. */
  phone: string | null;
}

export interface NewProfile {
  id: string;
  role: 'guardian' | 'student';
  fullName: string;
  phone: string | null;
  tz: string;
}

export interface SubjectStore {
  guardianByPhone(phone: string): Promise<GuardianRec | null>;
  studentByCode(code: string): Promise<StudentRec | null>;
  profileById(id: string): Promise<ProfileRec | null>;
  profileByUsername(username: string): Promise<ProfileRec | null>;
  /** A staff profile whose own phone, or whose teacher row's phone, is this one. */
  staffByPhone(phone: string): Promise<ProfileRec | null>;
  /** Any profile holding this phone (profiles.phone_e164 is unique). */
  profileByPhone(phone: string): Promise<ProfileRec | null>;
  insertProfile(row: NewProfile): Promise<void>;
  /** Writes the link only while the record has none: false = someone linked it first. */
  link(input: { kind: 'guardian' | 'student'; recordId: string; profileId: string }): Promise<boolean>;
}

/** GoTrue through the Admin API; signIn runs on an isolated client (no stored session). */
export interface AuthGate {
  idByEmail(email: string): Promise<string | null>;
  emailOf(id: string): Promise<string | null>;
  createUser(input: { email: string; password?: string; fullName: string }): Promise<string>;
  removeUser(id: string): Promise<void>;
  setPassword(id: string, password: string): Promise<void>;
  revokeSessions(id: string): Promise<void>;
  magicLink(email: string): Promise<CodeSession>;
  signIn(input: { email: string; password: string }): Promise<PasswordSession | null>;
}

export const CODE_STORE = Symbol('CODE_STORE');
export const SUBJECT_STORE = Symbol('SUBJECT_STORE');
export const AUTH_GATE = Symbol('AUTH_GATE');
export const SIGN_IN_CONFIG = Symbol('SIGN_IN_CONFIG');

export interface SignInConfig {
  /** LOGIN_CODE_PEPPER; null = no code is ever issued. */
  pepper: string | null;
  passwordMinLength: number;
  supabaseUrl: string;
  signInKey: string;
}

/** Staff = every base role but the family ones (guardian, student). */
export const isStaff = (role: UserRole): boolean => role !== 'guardian' && role !== 'student';
