import type { EchoEvent } from '@/modules/messaging/webhook/webhook.events';
import { where, type Receiving } from '@/modules/messaging/webhook/lines/webhook.lines';
import { get, list } from './webhook.fields';

// Meta's `smb_message_echoes` webhook field (WhatsApp Business app coexistence): every message the
// business sent from the WhatsApp Business app, with its content. Stored like a message sent from
// Kapso's inbox (external/), so the thread keeps both sides in order.

export const ECHO_FIELD = 'smb_message_echoes';

/** The echoes of one change's value (`message_echoes`), stamped with where they came in. */
export function readEchoes(value: unknown, at: Receiving): EchoEvent[] {
  return list(get(value, 'message_echoes')).map((message) => ({ message, ...where(at) }));
}
