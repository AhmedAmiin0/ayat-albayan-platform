import { isWaLine, type WaLine } from '@ab/catalog';
import { callsNumber } from '@/common/configuration/integrations/calls-number';
import { overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { allowedRecipients, loadEnv } from '@/config/env/env';
import { whatsappClient } from '@/modules/messaging/whatsapp/client-factory';
import { driverOf } from '@/modules/messaging/whatsapp/drivers/driver-record';
import type { MediaMessage, MediaNumber } from '@/modules/messaging/whatsapp/messages/inbound-media/inbound-media.repo';
import type { WhatsappClient, WhatsappLines } from '@/modules/messaging/whatsapp/whatsapp.types';
import type { NumberClients } from './number-clients';

/**
 * Who can fetch a message's media id: a client (and the line it stands for), or the CRM (no
 * client).
 */
type MediaSource = { kind: 'client'; client: WhatsappClient; line: WaLine | null } | { kind: 'crm' } | { kind: 'none' };

/**
 * A file a family sent to the calls number (docs/28 §10): only its own Kapso connection can fetch
 * the media id. The client is used for that download only (the calls number never sends a message).
 */
function callsSource(): MediaSource {
  const env = callsNumber()?.env;
  return env
    ? {
        kind: 'client',
        client: whatsappClient(env, { allowed: allowedRecipients(loadEnv()) }),
        line: null,
      }
    : { kind: 'none' };
}

/**
 * The client of the NUMBER a file came in on (or was sent from), never another number's (docs/23c):
 * - a crm number (the academy's old number): none, the CRM keeps its files and its client cannot
 *   fetch media (docs/19), so no call at all;
 * - the calls number (line or number purpose `calls`): its own Kapso connection, else none;
 * - module mode: that number's own client (NumberClients, the per-number registry); none when it
 *   has none (disabled, no credentials), as the sender: never the role's other number;
 * - else the line's client: the row's line, else its number's role, else notifications (a legacy
 *   single-line row).
 */
export function mediaSource(msg: MediaOf, from: MediaFrom): MediaSource {
  const calls = fetches(msg.number) && (msg.line ?? msg.number?.purpose) === 'calls';
  return calls ? callsSource() : lineSource(msg, from);
}

const fetches = (number: MediaNumber | null | undefined): boolean =>
  driverOf(number?.provider).fetchesMedia;

type MediaOf = Pick<MediaMessage, 'line'> & { number?: MediaNumber | null };
interface MediaFrom {
  lines: WhatsappLines;
  numbers: Pick<NumberClients, 'client'>;
}

/**
 * The row's line, else its number's role, else notifications; `calls` never gets here
 * (mediaSource).
 */
const messagingLine = (msg: MediaOf): WaLine => {
  const line = msg.line ?? msg.number?.purpose ?? 'notifications';
  return isWaLine(line) ? line : 'notifications';
};

/** Every number but the calls number: its own client, else its line's (as before docs/28 §10). */
function lineSource(msg: MediaOf, from: MediaFrom): MediaSource {
  const number = msg.number ?? null;
  if (!fetches(number)) return { kind: 'crm' };
  const line = messagingLine(msg);
  const own = number ? numberSource(number, from) : null;
  return own ?? { kind: 'client', client: from.lines[line], line };
}

/** The number's own client; in module mode none without one; null = fall back to its line. */
function numberSource(number: MediaNumber, from: MediaFrom): MediaSource | null {
  const own = from.numbers.client(number.id);
  if (own) return { kind: 'client', client: own, line: null };
  return overlayNumbers() ? { kind: 'none' } : null;
}
