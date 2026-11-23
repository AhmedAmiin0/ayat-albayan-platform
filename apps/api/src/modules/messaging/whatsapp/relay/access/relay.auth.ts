import { createHash, timingSafeEqual } from 'node:crypto';

// The script's Bearer is the notifications line's own CRM API key (owner 2026-11-01: «no need to
// enter new key, old key is valid»): no new secret. Compared in constant time over both sides'
// sha256, so neither the length nor a prefix of the key leaks through timing.

const BEARER = /^Bearer\s+(\S+)\s*$/i;

const digest = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

/** The token of an `Authorization: Bearer <token>` header; null when absent or another scheme. */
export function bearerOf(header: string | undefined): string | null {
  return BEARER.exec(header ?? '')?.[1] ?? null;
}

/** true only when the header carries exactly the expected key. */
export function keyMatches(header: string | undefined, expected: string): boolean {
  const given = bearerOf(header);
  return given !== null && timingSafeEqual(digest(given), digest(expected));
}
