import { createHash, randomBytes, randomInt } from 'node:crypto';

/** The public part of /pay/<token>: 32 random bytes, url-safe (43 characters), unguessable. */
export const newLinkToken = (): string => randomBytes(32).toString('base64url');

const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

/** Checkout's integration_identifier: 'ayat-sales-link-' + 8 random letters. */
export const integrationIdentifier = (): string =>
  `ayat-sales-link-${Array.from({ length: 8 }, () => LETTERS[randomInt(LETTERS.length)]).join('')}`;

/**
 * A stable uuid (v5 layout) for a Stripe id, used as payments.client_request_id (a uuid column): the same
 * Checkout Session or Refund always maps to the same id, so a replayed webhook records nothing twice.
 */
export function uuidFor(stripeId: string): string {
  const h = createHash('sha1').update(`ayat-stripe:${stripeId}`).digest();
  h[6] = ((h[6] ?? 0) & 0x0f) | 0x50;
  h[8] = ((h[8] ?? 0) & 0x3f) | 0x80;
  const hex = h.subarray(0, 16).toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
