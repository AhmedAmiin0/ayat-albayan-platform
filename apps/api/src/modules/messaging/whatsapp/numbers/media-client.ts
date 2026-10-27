import type { WaLine } from '@ab/shared';
import type { MediaNumber } from '../messages/inbound-media.queries';
import type { WhatsappClient, WhatsappLines } from '../whatsapp.types';
import type { NumberClients } from './number-clients';

/** Who can fetch a message's media id: a client (and the line it stands for), or the CRM (no client). */
export type MediaSource = { kind: 'client'; client: WhatsappClient; line: WaLine | null } | { kind: 'crm' };

/**
 * The client of the NUMBER a file came in on (or was sent from), never another number's (docs/23c):
 * - a crm number (the academy's old number): none, the CRM keeps its files and its client cannot
 *   fetch media (docs/19), so no call at all;
 * - module mode: that number's own client (NumberClients, the per-number registry);
 * - else the line's client: the row's line, else its number's role, else notifications (a legacy
 *   single-line row).
 */
export function mediaSource(
  msg: { line: WaLine | null; number?: MediaNumber | null },
  from: { lines: WhatsappLines; numbers: Pick<NumberClients, 'client'> },
): MediaSource {
  const number = msg.number ?? null;
  if (number?.provider === 'crm') return { kind: 'crm' };
  const own = number ? from.numbers.client(number.id) : null;
  if (own) return { kind: 'client', client: own, line: null };
  const line = msg.line ?? number?.purpose ?? 'notifications';
  return { kind: 'client', client: from.lines[line], line };
}
