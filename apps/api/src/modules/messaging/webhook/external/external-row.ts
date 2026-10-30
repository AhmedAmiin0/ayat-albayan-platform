import type { TablesInsert, TablesUpdate } from '@ab/db';
import { ACCOUNT_CODE_TEMPLATE, type NumberPurpose } from '@ab/shared';
import type { StatusEvent } from '@/modules/messaging/webhook/webhook.events';
import type { Contact } from '@/modules/messaging/webhook/webhook.types';
import { statusPatch } from '@/modules/messaging/webhook/status/webhook.status';
import type { ExternalMessage } from './external-message';

// The outbound row of a message sent outside the app (Kapso's inbox, the WhatsApp Business app).
// Pure. History, never work: never 'queued' (the sender only picks queued rows), created_by null
// and attempts 0 (the sender's claim counts every try); a failed one is refused by the admin's retry
// (MessagesQueries.requeue), so nothing can ever send it again.

/** Registry keys whose Meta name differs (migration 141, as the chat import maps them); else key = Meta name. */
const SEEDED_KEYS: Readonly<Record<string, string>> = { lesson_reminder_v2: 'lesson_reminder' };

export const templateKeyFor = (metaName: string): string => SEEDED_KEYS[metaName] ?? metaName;

interface ExternalRowInput {
  msg: ExternalMessage;
  phone: string;
  who: Contact;
  /** Where it was sent from: the line and, when known, the wa_numbers row. */
  from: { line: NumberPurpose | null; numberId: string | null };
  /** created_at: WhatsApp's time, nudged within its second like inbound rows (orderedAt). */
  at: Date;
  /** The delivery status that revealed it (webhook); none for the catch-up job. */
  event?: StatusEvent;
}


/**
 * Status and times: Kapso's status (else sent) at WhatsApp's time, moved forward by the event
 * (statusPatch: never backwards). A failed message never went out (as the chat import stores it).
 */
function delivery(msg: ExternalMessage, event: StatusEvent | undefined): TablesUpdate<'messages'> {
  const base = { status: msg.status ?? 'sent', sent_at: msg.at.toISOString(), delivered_at: null, read_at: null } as const;
  const out: TablesUpdate<'messages'> = { ...base, ...(event ? statusPatch(base, event) : null) };
  return out.status === 'failed' ? { ...out, sent_at: null } : out;
}

/** Where it was sent from: only the keys known (a single-line insert carries no `line`). */
const origin = ({ line, numberId }: ExternalRowInput['from']) => ({ ...(line ? { line } : {}), ...(numberId ? { number_id: numberId } : {}) });

export function externalRow({ msg, phone, who, from, at, event }: ExternalRowInput): TablesInsert<'messages'> {
  const templateKey = msg.templateName ? templateKeyFor(msg.templateName) : null;
  // A sign-in code (docs/30 §4, on the chat line since 2026-10-29) is kept as a bare marker: its text
  // and params hold the code, which staff must never read in the chat.
  const secret = templateKey === ACCOUNT_CODE_TEMPLATE;
  return {
    ...delivery(msg, event),
    ...origin(from),
    direction: 'outbound',
    phone_e164: phone,
    guardian_id: who.guardian?.id ?? null,
    lead_id: who.guardian ? null : (who.lead?.id ?? null),
    // Only real text or a caption, never a «[image]» placeholder (owner 2026-10-30): the
    // payload says what a row without text is (migration 985 lets an outbound row carry only it).
    body: secret ? null : msg.body,
    template_key: templateKey,
    template_params: secret ? null : msg.templateParams,
    wa_message_id: msg.waMessageId,
    reply_to_wa_id: msg.replyTo,
    media_id: msg.mediaId,
    media_mime: msg.mediaMime,
    media_name: msg.mediaName,
    created_at: at.toISOString(),
    created_by: null,
    // An edit, revoke or reaction is a hidden marker the database applies (migration 985).
    ...(msg.payload === null ? {} : { interactive_payload: msg.payload }),
  };
}
