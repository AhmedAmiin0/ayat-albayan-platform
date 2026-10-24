import type { WaLine } from '@ab/shared';
import type { LineNumbers } from '../../env';

// Which WhatsApp line a webhook change came in on (docs/12 §13.6). Pure.

/** True when no number is configured, the change carries no id, or the id is one of our lines. */
export function acceptsNumber(numbers: LineNumbers, id: string | undefined): boolean {
  const configured = Object.values(numbers).filter((n): n is string => typeof n === 'string');
  return configured.length === 0 || !id || configured.includes(id);
}

/** The receiving line, stamped ONLY while the chat line is configured; null otherwise. */
export function lineFor(numbers: LineNumbers, id: string | undefined): WaLine | null {
  if (!numbers.chat || !id) return null;
  if (id === numbers.chat) return 'chat';
  return id === numbers.notifications ? 'notifications' : null;
}

/** What the webhook needs of one wa_numbers row in module mode (docs/23c decision 7). */
export interface ReceivingNumber {
  id: string;
  purpose: WaLine;
  phone_number_id: string;
}

/** Where a change came in: its line (null = unstamped) and, in module mode, its wa_numbers id. */
export interface Receiving {
  line: WaLine | null;
  numberId?: string;
}

/**
 * Module mode: ANY number row, enabled or not («off = no sends, inbound still logged»), stamps its id and
 * purpose; a change with no id is kept unstamped (as acceptsNumber does); an unknown id → null (ignored).
 */
export function receivingNumber(numbers: readonly ReceivingNumber[], id: string | undefined): Receiving | null {
  if (!id) return { line: null };
  const n = numbers.find((x) => x.phone_number_id === id);
  return n ? { line: n.purpose, numberId: n.id } : null;
}
