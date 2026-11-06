import type { MessageView } from '@ab/shared';

// docs/44 BUG7, shared by web and mobile. The server dedups `who:phone:clientRequestId` with no
// kind and no expiry, and a replay returns the FIRST row (201) whatever the new body. The rule:
// after a send with no answer (deadline, network, 5xx) the sender owns a PINNED id for that chat;
// every send from it reuses that id until a send with it gets an ANSWER (a 2xx or a 4xx). Nothing
// is guessed from reads: the server's answer alone releases the pin.

/** A send with no answer (its bubble on mobile, the box's failed code on web). */
export const SEND_UNCONFIRMED = 'send_unconfirmed';

/** A send with the pinned id was answered with the FIRST message: the edit was not sent. */
export const SEND_REPLAYED = 'send_replayed';

/**
 * A 2xx text answer carrying another message than the one sent: a replay of the first one under
 * this id (checked on EVERY 2xx: a 4xx such as 409 session_closed or 400 reply_not_in_thread is
 * decided before the dedup lookup, so an id it released may still replay). The server only trims,
 * so a real send always echoes the same body.
 */
export const replayedOther = (row: Pick<MessageView, 'body'>, sentBody: string): boolean =>
  (row.body ?? '').trim() !== sentBody.trim();
