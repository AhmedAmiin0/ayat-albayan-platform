import { MANUAL_ENTRIES, PUSH_ENTRIES } from './catalogue.other.js';
import type { NotificationEntry } from './catalogue.types.js';
import { WHATSAPP_ENTRIES } from './catalogue.whatsapp.js';

export * from './catalogue.types.js';

/**
 * Every notification the academy sends (docs/23 §2b), in the order «ماذا يُرسل ومتى» lists them:
 * families' WhatsApp first, then the hand sends, then the staff's bell and push. A new producer
 * needs a row here (catalogue.test.ts fails otherwise).
 */
export const NOTIFICATION_CATALOGUE = [...WHATSAPP_ENTRIES, ...MANUAL_ENTRIES, ...PUSH_ENTRIES] as const;

export type NotificationKey = (typeof NOTIFICATION_CATALOGUE)[number]['key'];

export const NOTIFICATION_KEYS: readonly NotificationKey[] = NOTIFICATION_CATALOGUE.map((e) => e.key);

/** One row by key (typed: the catalogue's own rows only). */
export function notificationEntry(key: NotificationKey): NotificationEntry<NotificationKey> {
  const found = NOTIFICATION_CATALOGUE.find((e) => e.key === key);
  if (!found) throw new Error(`unknown notification ${key}`);
  return found;
}
