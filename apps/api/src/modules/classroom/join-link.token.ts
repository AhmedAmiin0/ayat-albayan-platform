import { createHash, randomBytes } from 'node:crypto';
import { DEFAULT_JOIN_WINDOW, roomClosesAt, type JoinWindowConfig } from '@ab/shared';

// The family's one-lesson guest link: a random 192-bit token (32 chars, it rides in the WhatsApp
// URL button), of which only the sha256 is stored (lesson_join_links.token_hash), so a database
// leak holds no usable link and a row can be revoked.

const TOKEN_RE = /^[A-Za-z0-9_-]{32}$/;

export const newLinkToken = (): string => randomBytes(24).toString('base64url');

/** False for anything that cannot be one of ours: no database call is made for it. */
export const looksLikeLinkToken = (token: string): boolean => TOKEN_RE.test(token);

export const hashLinkToken = (token: string): string => createHash('sha256').update(token).digest('hex');

/** A link dies when its classroom closes (settings.join_closes_after_min after the lesson ends, at creation). */
export const linkExpiry = (lesson: { ends_at: string }, win: JoinWindowConfig = DEFAULT_JOIN_WINDOW): string =>
  roomClosesAt(lesson, win);

export type LinkCheck = 'ok' | 'revoked' | 'expired';

export function checkLink(row: { expires_at: string; revoked_at: string | null }, now: Date): LinkCheck {
  if (row.revoked_at) return 'revoked';
  return Date.parse(row.expires_at) <= now.getTime() ? 'expired' : 'ok';
}
