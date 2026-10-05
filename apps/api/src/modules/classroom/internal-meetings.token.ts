import { randomBytes } from 'node:crypto';
import { JOIN_ROLES, type JoinRole } from '@ab/shared';
import type { AuthUser } from '../../common/auth/verify-token';
import { hashLinkToken } from './join-link.token';

// «اجتماع داخلي» link /m/<token>: 32 random bytes (43 base64url chars); only the sha256 is stored
// (meetings.link_token_hash, the same hash as the lesson links), so the URL is shown once.

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export const newMeetingToken = (bytes: (n: number) => Buffer = randomBytes): string => bytes(32).toString('base64url');

/** False for anything that cannot be one of ours: no database call is made for it. */
export const looksLikeMeetingToken = (token: string): boolean => TOKEN_RE.test(token);

export const hashMeetingToken = hashLinkToken;

/** The creator or any admin may end the meeting and issue a new link. */
export const canManageMeeting = (user: Pick<AuthUser, 'id' | 'role'>, meeting: { created_by: string | null }): boolean =>
  user.role === 'admin' || (meeting.created_by !== null && meeting.created_by === user.id);

/**
 * A staff login's role in a meeting's room: an admin stays admin; the creator hosts as `teacher`
 * (so canRemove lets them remove guests, assistants and salespeople); any other staff login joins
 * with its own role. null for a login with no staff role (a guardian): refused.
 */
export function meetingRoleOf(user: Pick<AuthUser, 'id' | 'role'>, meeting: { created_by: string | null }): JoinRole | null {
  if (user.role === 'admin') return 'admin';
  if (meeting.created_by !== null && meeting.created_by === user.id) return 'teacher';
  if (user.role === 'teacher' || user.role === 'assistant' || user.role === 'sales') return user.role;
  return null;
}

/** The role inside a server-minted identity (`<role>-<12 hex>`, newIdentity); null when it is none of ours. */
export function roleOfIdentity(identity: string): JoinRole | null {
  const m = /^([a-z]+)-[0-9a-f]{12}$/.exec(identity);
  return JOIN_ROLES.find((r) => r === m?.[1]) ?? null;
}
