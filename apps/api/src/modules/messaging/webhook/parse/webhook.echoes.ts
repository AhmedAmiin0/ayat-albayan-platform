import type { EchoEvent } from '../webhook.events';
import { where, type Receiving } from '../lines/webhook.lines';

// Meta's `smb_message_echoes` webhook field (WhatsApp Business app coexistence): every message the
// business sent from the WhatsApp Business app, with its content. Stored like a message sent from
// Kapso's inbox (external/), so the thread keeps both sides in order.

export const ECHO_FIELD = 'smb_message_echoes';

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The echoes of one change's value (`message_echoes`), stamped with where they came in. */
export function readEchoes(value: unknown, at: Receiving): EchoEvent[] {
  const echoes = value !== null && typeof value === 'object' ? (value as Record<string, unknown>)['message_echoes'] : undefined;
  return list(echoes).map((message) => ({ message, ...where(at) }));
}
