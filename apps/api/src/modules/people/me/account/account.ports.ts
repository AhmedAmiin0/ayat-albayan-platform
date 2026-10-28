import type { AccountRole } from '@ab/shared';
import type { AvatarFiles } from '../../../../common/storage/avatars/avatar-files';

// What «حسابي» (R-ACC-01..05) needs from the DB, the Auth API and Storage. account.queries.ts,
// account.auth.ts and common/storage/avatars implement them; the unit tests use account.fakes.ts.

/** The caller's own profile as the account page reads it. */
export interface AccountRow {
  id: string;
  full_name: string;
  phone_e164: string | null;
  avatar_path: string | null;
  role: AccountRole;
  /** The teacher record linked to this login, if any (the initials tone follows it). */
  teacher_id?: string | null;
}

/**
 * The ONLY profile columns a user may write on their own login (rule 9). role, role_id and
 * disabled_* are never in this list, whatever a body or a caller holds.
 */
export const SELF_WRITABLE = ['full_name', 'phone_e164', 'avatar_path'] as const;
export type SelfPatch = Partial<{ full_name: string; phone_e164: string | null; avatar_path: string | null }>;

/** Copies the whitelisted columns only; anything else in `input` is dropped. */
export function selfWritable(input: object): SelfPatch {
  const out: Record<string, unknown> = {};
  for (const key of SELF_WRITABLE) {
    const value: unknown = Reflect.get(input, key);
    if (value !== undefined) out[key] = value;
  }
  return out as SelfPatch;
}

export interface AccountStore {
  get(id: string): Promise<AccountRow | null>;
  /** Writes only selfWritable(patch); 409 phone_taken on a unique violation. */
  update(id: string, patch: SelfPatch): Promise<void>;
  /** Is the phone on another profile, or on a teacher record that is not this login's? */
  phoneTaken(phone: string, exceptId: string): Promise<boolean>;
}

export interface AccountAuth {
  emailOf(id: string): Promise<string | null>;
  /** true when `password` signs `email` in; a wrong one is false, never an exception. */
  passwordMatches(input: { email: string; password: string }): Promise<boolean>;
  /** Admin update (no SMTP): a new email is confirmed at once; 409 email_taken. */
  update(id: string, patch: { email?: string; password?: string }): Promise<void>;
  /** Ends every session of the user but `keep` (null = all); their devices' push bindings go with them. */
  revokeOtherSessions(input: { userId: string; keep: string | null }): Promise<void>;
}

/** The photo's Storage port, shared with the admin's staff photos (common/storage/avatars). */
export type AccountFiles = AvatarFiles;

export const ACCOUNT_STORE = Symbol('ACCOUNT_STORE');
export const ACCOUNT_AUTH = Symbol('ACCOUNT_AUTH');
export const ACCOUNT_CONFIG = Symbol('ACCOUNT_CONFIG');

export interface AccountConfig {
  passwordMinLength: number;
  supabaseUrl: string;
  /** The key of the isolated password-check client (anon key; the service key when unset). Never logged. */
  signInKey: string;
}
