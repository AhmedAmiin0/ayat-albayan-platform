import type { UserRole } from '../roles.js';
import type { LinkKind, UserStatus } from './users.schemas.js';

/** The teacher / student / guardian row a login belongs to. */
export interface LinkedRecord {
  kind: LinkKind;
  id: string;
  name: string;
  /** Students only: AB-nnnn. */
  code: string | null;
}

export interface UserView {
  id: string;
  email: string | null;
  full_name: string;
  phone_e164: string | null;
  role: UserRole;
  /** The held role (the system role's id when none is custom). */
  role_id: string | null;
  role_key: string | null;
  status: UserStatus;
  disabled_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  linked: LinkedRecord | null;
}

/** GET /users/:id: the list row plus what the edit panel needs. */
export interface UserDetail extends UserView {
  locale: string;
  tz: string;
  disabled_reason: string | null;
}

export interface UserPage {
  items: UserView[];
  total: number;
  page: number;
  pageSize: number;
}

/** Shown ONCE in the response of create / reset-password; never stored or logged. */
export interface IssuedCredential {
  kind: 'password' | 'link';
  value: string;
}

export interface UserWithCredential {
  user: UserDetail;
  credential: IssuedCredential | null;
}

export interface LinkCandidate {
  kind: LinkKind;
  id: string;
  name: string;
  code: string | null;
}

/** A role the user form may offer; `assignable` = the actor holds every grant of it. */
export interface UserRoleOption {
  id: string;
  key: string;
  name_ar: string;
  name_en: string | null;
  base_role: UserRole;
  is_system: boolean;
  assignable: boolean;
}

/** One table (and count) that keeps a user from being deleted. */
export interface UserReference {
  table: string;
  column: string;
  count: number;
}
