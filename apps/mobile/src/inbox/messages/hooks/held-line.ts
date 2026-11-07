import { isAwaitingReply, type MessageView } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { isUnconfirmed } from '@/inbox/thread/send/unconfirmed';

type HeldRow = Pick<MessageView, 'status' | 'error_code'>;

/** The queued rows that say why they wait, and what they say. */
const HELD: readonly [(m: HeldRow) => boolean, () => string][] = [
  [isAwaitingReply, () => t.messages.awaitingReply],
  // docs/44 BUG7: our send ended with no answer; the chat was re-read and did not show it yet.
  [isUnconfirmed, () => t.messages.sendUnconfirmed],
];

/** A held text's line («بانتظار رد العائلة»), an unconfirmed send's; else null. */
export const heldLine = (m: HeldRow): string | null =>
  HELD.find(([is]) => is(m))?.[1]() ?? null;
