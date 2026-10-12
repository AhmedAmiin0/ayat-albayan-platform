import { PUSH_KINDS, type PushKind } from '@ab/shared';

// A push's `data` is PushService's { kind, ...event.data } (docs/12 §6): untrusted JSON, so every
// field is checked before it reaches a route.

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

export function pushKind(data: unknown): PushKind | null {
  const kind = isRecord(data) ? data['kind'] : undefined;
  return PUSH_KINDS.find((k) => k === kind) ?? null;
}

export function pushField(data: unknown, key: string): string | null {
  const value = isRecord(data) ? data[key] : undefined;
  return typeof value === 'string' && value ? value : null;
}

/** The phone a message push is about, if it carries a usable one. */
export function pushPhone(data: unknown): string | null {
  const phone = pushField(data, 'phone');
  return phone && /^\+\d{6,15}$/.test(phone) ? phone : null;
}
