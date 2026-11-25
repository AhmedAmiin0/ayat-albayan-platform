import type { PasswordSession, CodeSession } from '@ab/shared';
import type { UserRole } from '@ab/catalog';

// Family accounts (docs/30): what the sign-in flows read and write, as ports so the flows are
// tested on in-memory fakes (sign-in.fakes.ts) and run on Supabase (codes.queries,
// subjects.queries, auth-gate).
/** report_view: a report page; short_link: a managed link's gate. */
type AccountPurpose = 'sign_in' | 'reset_password' | 'set_password';
export type CodePurpose = AccountPurpose | 'report_view' | 'short_link';
export type SubjectKind = 'guardian' | 'student' | 'profile' | 'report' | 'teacher' | 'short_link';

/** Who a code is for: guardians / students / profiles (staff) / lesson_reports / teachers .id. */
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

/** login_codes of one phone in the last 24 hours (the per-phone limits, counted in the DB). */
export interface PhoneStats {
  sentLast15Min: number;
  sentLastDay: number;
  failedLastDay: number;
}

export interface CodeStore {
  insert(row: NewCode): Promise<string>;
  /** The subject's newest code for these purposes, whatever its state (older ones never count). */
  latest(subject: Subject, purposes: readonly CodePurpose[]): Promise<LiveCode | null>;
  /** Counts one attempt on a live code, returns its hash; null = expired, spent or out of tries. */
  take(id: string): Promise<string | null>;
  /** Spends the code: true for the first caller only. */
  spend(id: string): Promise<boolean>;
  delivered(id: string, error: string | null): Promise<void>;
  phoneStats(phone: string, now: Date): Promise<PhoneStats>;
  /** Wrong attempts over every phone in the last hour (the site-wide breaker). */
  failedLastHour(now: Date): Promise<number>;
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
  /** The guardian's main phone: where the student's password codes go. */
  guardianPhone: string;
}

/** A family number on file (guardian_phones) and whose login it opens; `phone`: the code's. */
export type FamilyLogin =
  | { kind: 'guardian'; phone: string; rec: GuardianRec }
  | { kind: 'student'; phone: string; rec: StudentRec };

export interface ProfileRec {
  id: string;
  role: UserRole;
  disabled: boolean;
  /** profiles.phone_e164 only (never the teacher row's: see subjects.queries toProfile). */
  phone: string | null;
}

/** An active teacher record and its login, if any (docs/46 A2): `login` null = no profile_id. */
export interface TeacherRec {
  id: string;
  name: string;
  tz: string;
  /** teachers.phone_e164: the first code's destination only (D2). */
  recordPhone: string | null;
  profileId: string | null;
  login: ProfileRec | null;
}

/** The records a lazy login links to (one table each). */
export type LinkKind = 'guardian' | 'student' | 'teacher';

export interface NewProfile {
  id: string;
  role: LinkKind;
  fullName: string;
  phone: string | null;
  tz: string;
}

export interface SubjectStore {
  guardianByPhone(phone: string): Promise<GuardianRec | null>;
  /** Any family number (guardianByPhone: the main one only): main, second, a student's own. */
  familyByPhone(phone: string): Promise<FamilyLogin | null>;
  studentByCode(code: string): Promise<StudentRec | null>;
  profileById(id: string): Promise<ProfileRec | null>;
  profileByUsername(username: string): Promise<ProfileRec | null>;
  /** A staff profile whose own or teacher-row phone is this one (a conflict / lookup key only). */
  staffByPhone(phone: string): Promise<ProfileRec | null>;
  /** An active teacher whose login's phone (role teacher) or record phone is this one. */
  teacherByPhone(phone: string): Promise<TeacherRec | null>;
  /** Any profile holding this phone (profiles.phone_e164 is unique). */
  profileByPhone(phone: string): Promise<ProfileRec | null>;
  insertProfile(row: NewProfile): Promise<void>;
  /** True when any guardians / students / teachers row links to this profile. */
  isLinked(profileId: string): Promise<boolean>;
  /** Writes the link only while the record has none: false = someone linked it first. */
  link(input: { kind: LinkKind; recordId: string; profileId: string }): Promise<boolean>;
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
