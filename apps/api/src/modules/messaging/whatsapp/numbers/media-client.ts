import { isWaLine, type WaLine } from '@ab/shared';
import { callsNumber } from '../../../../common/integrations/calls-number';
import { overlayNumbers } from '../../../../common/integrations/numbers-overlay';
import { allowedRecipients, loadEnv } from '../../../../config/env/env';
import { whatsappClient } from '../client-factory';
import type { MediaMessage, MediaNumber } from '../messages/inbound-media.queries';
import type { WhatsappClient, WhatsappLines } from '../whatsapp.types';
import type { NumberClients } from './number-clients';

/** Who can fetch a message's media id: a client (and the line it stands for), or the CRM (no client). */
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
  const calls = msg.number?.provider !== 'crm' && (msg.line ?? msg.number?.purpose) === 'calls';
  return calls ? callsSource() : lineSource(msg, from);
}

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
  if (number?.provider === 'crm') return { kind: 'crm' };
  const line = messagingLine(msg);
  const own = number ? from.numbers.client(number.id) : null;
  if (own) return { kind: 'client', client: own, line: null };
  if (number && overlayNumbers()) return { kind: 'none' };
  return { kind: 'client', client: from.lines[line], line };
}
