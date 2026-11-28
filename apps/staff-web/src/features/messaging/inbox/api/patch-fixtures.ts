import type { LiveRow } from '@ab/client-core';
import type { MessageView, ThreadView } from '@ab/shared';
import type { MessageStatus } from '@ab/catalog';
import { message, thread as chatRow } from '@/features/messaging/inbox/testing/inbox-fixture';
import { uid } from '@/features/messaging/inbox/testing/uid';

// Rows and a hand-resolved read for the live-patch tests (docs/44 K1).

export const PHONE = '+966501234567';

export const live = (id: string, s: MessageStatus): LiveRow => ({
  id: uid(id),
  s,
  d: 'outbound',
  at: '2026-11-07T10:00:00Z',
});

/** An outgoing row named by a short label: its body is the label, its id the label's uuid. */
export const msg = (id: string, status: MessageStatus, over: Partial<MessageView> = {}) =>
  message({
    id: uid(id),
    direction: 'outbound',
    status,
    body: id,
    created_at: `2026-11-07T10:00:0${id.length}Z`,
    ...over,
  });

export const thread = (id: string, status: MessageStatus) =>
  ({ phone_e164: PHONE, last_message_id: uid(id), last_status: status }) as ThreadView;

/** A whole chat row of a list answer, as the shared list route reads it. */
export const listRow = (status: MessageStatus): ThreadView =>
  chatRow({ phone_e164: PHONE, last_status: status });

/** A read the test answers by hand (in flight until `resolve`). */
export function heldRead<T>() {
  const box: { resolve: (value: T) => void } = { resolve: () => undefined };
  const promise = new Promise<T>((resolve) => {
    box.resolve = resolve;
  });
  return { promise, resolve: (value: T) => box.resolve(value) };
}
