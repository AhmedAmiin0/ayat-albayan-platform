/**
 * A v4-shaped uuid for an idempotency key (rule 8), not a secret: the runtime's crypto when it has
 * one. ponytail: Math.random is enough for a per-form dedup key; add expo-crypto if one must be secret.
 */
export function requestId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === 'x' ? r : (r % 4) + 8).toString(16);
  });
}
