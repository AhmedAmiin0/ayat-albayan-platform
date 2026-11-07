import type { LiveRow } from '@ab/client-core';
import type { MessageStatus, MessageView, ThreadView } from '@ab/shared';

// Rows and a hand-resolved read for the live-patch tests (docs/44 K1).

export const PHONE = '+966501234567';

export const live = (id: string, s: MessageStatus): LiveRow => ({
  id,
  s,
  d: 'outbound',
  at: '2026-11-07T10:00:00Z',
});

export const msg = (id: string, status: MessageStatus, over: Partial<MessageView> = {}) =>
  ({ id, status, body: id, created_at: `2026-11-07T10:00:0${id.length}Z`, ...over }) as MessageView;

export const thread = (id: string, status: MessageStatus) =>
  ({ phone_e164: PHONE, last_message_id: id, last_status: status }) as ThreadView;

/** A read the test answers by hand (in flight until `resolve`). */
export function heldRead<T>() {
  const box: { resolve: (value: T) => void } = { resolve: () => undefined };
  const promise = new Promise<T>((resolve) => {
    box.resolve = resolve;
  });
  return { promise, resolve: (value: T) => box.resolve(value) };
}
