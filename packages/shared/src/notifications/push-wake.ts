import type { PushKind } from '@ab/catalog';

/**
 * The pushes that mean «the inbox changed on the server» (docs/43 §5, APK 0.6.0): the API sends
 * them as a background wake-up too (high priority, content-available), and the app's background
 * task syncs its phone message store for them. The payload stays a wake-up: kind and phone only.
 */
export const PUSH_WAKE_KINDS = ['new_message', 'new_lead'] as const satisfies readonly PushKind[];

/** A push of this kind also wakes the app (a string from a push's data counts too). */
export const wakesInbox = (kind: string | undefined): boolean =>
  PUSH_WAKE_KINDS.some((k) => k === kind);
