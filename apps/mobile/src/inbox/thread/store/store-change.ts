import type { SyncPlan } from '@ab/client-core';
import type { HeldRow } from './store-read';

/** What a write changed: these chats, or 'all' (a reset, a wipe, another owner). */
export type StoreChange = ReadonlySet<string> | 'all';

/** The chats a plan touches: its rows, its chats-list rows and the chats of removed rows. */
export function changedPhones(plan: SyncPlan, removed: readonly HeldRow[]): StoreChange {
  if (plan.reset) return 'all';
  const phones = [
    ...plan.upsert.map((m) => m.phone_e164),
    ...plan.threads.map((t) => t.phone_e164),
    ...removed.map((r) => r.phone),
  ];
  return new Set(phones);
}

/** Whether a reader of `phone` must read again after `change`. */
export const touches = (change: StoreChange, phone: string): boolean =>
  change === 'all' || change.has(phone);
