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
