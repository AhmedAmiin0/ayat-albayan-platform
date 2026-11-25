// The composer's send bookkeeping, shared by the web and the mobile kit: what stays
// in the box after a send, and the client_id that makes a retry idempotent (rule 8).

/** The text that went out and its client_id, kept until the API has it. */
export interface SendAttempt {
  body: string;
  clientId: string;
}

/**
 * What stays in the box once `sent` went out: only what was sent leaves, so words typed while it
 * was sending survive; a box rewritten in the meantime is left as it is, never wiped.
 */
export function remainingDraft(input: { current: string; sent: string }): string {
  const { current, sent } = input;
  return current.startsWith(sent) ? current.slice(sent.length).trimStart() : current;
}

interface CryptoLike {
  randomUUID?: () => string;
}

const hexDigit = (): string => Math.floor(Math.random() * 16).toString(16);

/** A v4 uuid from Math.random: a dedup key, not a secret. */
function fallbackUuid(): string {
  const hex = Array.from({ length: 32 }, hexDigit).join('');
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}

/**
 * A send's client_id (rule 8: a resend with the same id returns the stored message): a v4 uuid,
 * from the runtime's crypto when it has one, else from Math.random.
 */
export function newClientId(): string {
  const runtime = (globalThis as { crypto?: CryptoLike }).crypto;
  return runtime?.randomUUID ? runtime.randomUUID() : fallbackUuid();
}

/**
 * The client_id of this send: the failed attempt's when the same text is sent again (a retry the
 * server may already hold), else a new one.
 */
export function sendIdFor(
  last: SendAttempt | null,
  body: string,
  fresh: () => string = newClientId,
): string {
  return last?.body === body ? last.clientId : fresh();
}
