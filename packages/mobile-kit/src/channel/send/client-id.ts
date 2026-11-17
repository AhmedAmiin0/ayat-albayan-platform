/**
 * A send's client_id (rule 8: a resend with the same id returns the stored message): a v4 uuid,
 * from the runtime's crypto when it has one, else from Math.random (a dedup key, not a secret).
 */
export function newClientId(): string {
  const runtime = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (runtime?.randomUUID) return runtime.randomUUID();
  const digits = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  const variant = (8 + Math.floor(Math.random() * 4)).toString(16);
  const hex = digits.join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    `4${hex.slice(13, 16)}`,
    `${variant}${hex.slice(17, 20)}`,
    hex.slice(20, 32),
  ].join('-');
}
