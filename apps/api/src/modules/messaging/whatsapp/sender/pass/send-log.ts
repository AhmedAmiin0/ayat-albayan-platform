import type { WaLine } from '@ab/shared';
import type { SendOutcome } from '@/modules/messaging/whatsapp/sender/message.job';
import type { DueMessage } from '@/modules/messaging/whatsapp/sender/sender.due';

// docs/42 42-2: one `wa_send` line per provider call. Ids, the line, the kind and times only:
// never a phone, a body, a template parameter or a token.

type SendKind = 'template' | 'media' | 'interactive' | 'text';

type KindRow = Pick<DueMessage, 'template_key' | 'media_path' | 'interactive_payload'>;

/** First match wins. */
const KINDS: readonly (readonly [SendKind, (row: KindRow) => boolean])[] = [
  ['template', (row) => row.template_key !== null],
  ['media', (row) => Boolean(row.media_path)],
  ['interactive', (row) => row.interactive_payload !== null && row.interactive_payload !== undefined],
];

export const sendKind = (row: KindRow): SendKind =>
  KINDS.find(([, is]) => is(row))?.[0] ?? 'text';

interface SendTiming {
  id: string;
  line: WaLine;
  kind: SendKind;
  /** Queued (created_at) → the provider call; null when the row has no created_at. */
  queue_ms: number | null;
  provider_ms: number;
  /** The «sent» write (with its retries); null when the provider refused. */
  record_ms: number | null;
  outcome: SendOutcome;
  /** New TCP (+ TLS) connections opened during the provider call (docs/42 42-6). */
  new_conns: number;
}

export const sendLine = (t: SendTiming): string => JSON.stringify({ evt: 'wa_send', ...t });
