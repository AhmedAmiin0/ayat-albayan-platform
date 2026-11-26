import { digestEqual } from '@/common/infra/crypto/safe-equal';

// The script's Bearer is the notifications line's own CRM API key (the old key stays valid):
// no new secret. Compared in constant time over both sides'
// sha256, so neither the length nor a prefix of the key leaks through timing.

const BEARER = /^Bearer\s+(\S+)\s*$/i;

/** The token of an `Authorization: Bearer <token>` header; null when absent or another scheme. */
export function bearerOf(header: string | undefined): string | null {
  return BEARER.exec(header ?? '')?.[1] ?? null;
}

/** true only when the header carries exactly the expected key. */
export function keyMatches(header: string | undefined, expected: string): boolean {
  const given = bearerOf(header);
  return given !== null && digestEqual(given, expected);
}
