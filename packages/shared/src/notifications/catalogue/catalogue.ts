import { FAMILY_ENTRIES } from './catalogue.family';
import { MANUAL_ENTRIES, PUSH_ENTRIES } from './catalogue.other';
import type { NotificationEntry } from './catalogue.types';
import { SCHEDULE_ENTRIES } from './catalogue.schedule';
import { WHATSAPP_ENTRIES } from './catalogue.whatsapp';

export * from './catalogue.types';

/** Every notification sent (docs/23 §2b); a new producer needs a row here. */
export const NOTIFICATION_CATALOGUE = [
  ...WHATSAPP_ENTRIES,
  ...SCHEDULE_ENTRIES,
  ...MANUAL_ENTRIES,
  ...FAMILY_ENTRIES,
  ...PUSH_ENTRIES,
] as const;

export type NotificationKey = (typeof NOTIFICATION_CATALOGUE)[number]['key'];

export const NOTIFICATION_KEYS: readonly NotificationKey[] = NOTIFICATION_CATALOGUE.map(
  (e) => e.key,
);

/** One row by key (typed: the catalogue's own rows only). */
export function notificationEntry(key: NotificationKey): NotificationEntry<NotificationKey> {
  const found = NOTIFICATION_CATALOGUE.find((e) => e.key === key);
  if (!found) throw new Error(`unknown notification ${key}`);
  return found;
}
