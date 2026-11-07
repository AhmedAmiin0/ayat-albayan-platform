import { EMPTY_SYNC, type SyncPlan } from '@ab/client-core';
import type { MessageStore } from './message-store';
import type { MessageStatus, SyncMessage, ThreadSync, ThreadView } from '@ab/shared';
import { message, thread } from '@/inbox/shared/thread-fixtures';

// Rows and answers for the store's tests.

export const A = '+966500000001';
export const B = '+966500000002';
export const id = (n: number) => `c0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const at = (s: number) => `2026-11-06T10:00:${String(s).padStart(2, '0')}.000001+00:00`;

interface RowInput {
  n: number;
  phone?: string;
  s?: number;
  status?: MessageStatus;
}

/** Row n in chat `phone`, created and stamped at second `s`. */
export function row({ n, phone = A, s = n, status = 'sent' }: RowInput): SyncMessage {
  const base = message({ id: id(n), phone_e164: phone, created_at: at(s), status });
  return { ...base, updated_at: at(s) };
}

export const threadRow = (phone: string, last: number): ThreadView => ({
  ...thread,
  phone_e164: phone,
  last_message_id: id(last),
  last_message_at: at(last),
});

/** A GET /threads/sync answer. */
export const answer = (over: Partial<ThreadSync> = {}): ThreadSync => ({
  messages: [],
  threads: [],
  gone: [],
  cursor: null,
  has_more: false,
  scope: 'admin:1',
  ...over,
});

/** A plan that only writes these rows (and the given scope). */
export const plan = (upsert: SyncMessage[], over: Partial<SyncPlan> = {}): SyncPlan => ({
  reset: false,
  upsert,
  remove: [],
  threads: [],
  state: { ...EMPTY_SYNC, scope: 'admin:1' },
  ...over,
});

/** store.apply from the mark the store holds now (as the engine plans from store.state()). */
export const applyAs = async (store: MessageStore, p: SyncPlan, owner = 'user-a') =>
  store.apply(p, { owner, base: await store.state() });
