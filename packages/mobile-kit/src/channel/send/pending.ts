import type { ChannelMessageView } from '@ab/shared';

// The optimistic row of a send (review 2026-11-17): shown at once, keyed by its client_id, until
// the API's answer re-reads the thread; a failure takes it away again.

const PENDING = 'pending:';

/** The optimistic row's id for a send. */
export const pendingId = (clientId: string): string => `${PENDING}${clientId}`;

/** Still on its way: no menu, no swipe, «جارٍ الإرسال…» and the clock tick. */
export const isPending = (m: Pick<ChannelMessageView, 'id'>): boolean => m.id.startsWith(PENDING);

interface PendingInput {
  body: string;
  clientId: string;
  /** The phone's clock: only until the API's own time comes back. */
  at: Date;
}

/** My message as it will look once the API has it, before it does. */
export function pendingMessage({ body, clientId, at }: PendingInput): ChannelMessageView {
  return {
    ...{ id: pendingId(clientId), body, sender_role: 'unknown', sender_name: '', mine: true },
    ...{ created_at: at.toISOString(), edited: false, deleted: false, kind: 'text' },
    ...{ attachment: null, reply_to: null, read_by_all: false, client_id: clientId },
  };
}
