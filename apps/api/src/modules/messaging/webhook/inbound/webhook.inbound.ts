import type { TablesInsert } from '@ab/db';
import {
  payloadRef,
  quickReplyIntent,
  ratingOfIntent,
  ratingOfText,
  type LessonRating,
  type QuickReplyIntent,
} from '@ab/shared';
import type { PushKind } from '@ab/catalog';
import { ar } from '@/common/infra/i18n/server-text';
import { z } from 'zod';
import type { PushEvent } from '@/common/push/push.service';
import { fill } from '@/modules/reporting/report-pdf';
import type { InboundEvent } from '@/modules/messaging/webhook/webhook.events';
import type { Contact } from '@/modules/messaging/webhook/shared/webhook.types';
import type { RowInput } from './inbound.types';

// Pure parts of storing an inbound message (R-MSG-04, R-LEAD-01) and the admin push (R-MOB-01).

/** A burst of messages from one phone is one new_message push per 10 minutes (docs/12 §3.5). */
export const PUSH_BUCKET_MS = 10 * 60_000;

/** confirm / reschedule / stop from our button payload, else from the text the person typed. */
export function intentOf(m: InboundEvent): QuickReplyIntent | null {
  const input = m.replyKey ?? m.body;
  return input ? quickReplyIntent(input) : null;
}

/**
 * A lesson_rating tap (migration 195): our «rate_<value>:<lesson>» payload, else — a template
 * button Meta sent with its text only — the exact text of one of the three buttons. Never typed
 * text.
 */
export function ratingOf(m: InboundEvent): LessonRating | null {
  return ratingOfIntent(intentOf(m)) ?? (m.type === 'button' ? ratingOfText(m.body) : null);
}

/**
 * The lesson id inside our quick-reply payload («confirm:<lesson id>»). Only from a button Meta
 * delivered, never from typed text, so nobody can confirm a lesson by typing its id.
 */
export function payloadLesson(m: InboundEvent): string | null {
  const ref = m.replyKey ? payloadRef(m.replyKey) : null;
  return ref && z.uuid().safeParse(ref).success ? ref : null;
}

/**
 * The messages row. Inbound rows are «delivered» (they reached us); read_at stays null until an
 * admin opens the thread (= unread). Media is stored by id only; the file is fetched later.
 * created_at is when the person sent it (Meta's timestamp), not when the webhook arrived: a late
 * or re-sent webhook must not stretch the 24 h window or reorder the thread.
 */
/**
 * Keys set only when known (none = no key, as a single-line insert carries no `line`): a
 * document's name (the PDF card's), the read stamp, the line (docs/12 §13.2) and the receiving
 * number (docs/23c decision 7; legacy: looked up by phone_number_id, InboundStore).
 */
function knownKeys(m: InboundEvent, read: boolean | undefined) {
  return {
    ...(m.mediaName ? { media_name: m.mediaName } : {}),
    ...(read ? { read_at: m.at.toISOString() } : {}),
    ...(m.line ? { line: m.line } : {}),
    ...(m.numberId ? { number_id: m.numberId } : {}),
  };
}

export function inboundRow(input: RowInput): TablesInsert<'messages'> {
  const { m, phone, who, leadId, lessonId, read } = input;
  return {
    direction: 'inbound',
    status: 'delivered',
    phone_e164: phone,
    lead_id: leadId,
    guardian_id: who.guardian?.id ?? null,
    lesson_id: lessonId,
    body: m.body,
    wa_message_id: m.waMessageId,
    reply_to_wa_id: m.replyTo,
    media_id: m.mediaId,
    media_mime: m.mediaMime,
    interactive_payload: m.payload,
    created_at: m.at.toISOString(),
    ...knownKeys(m, read),
  };
}

/**
 * Meta's timestamps are whole seconds: two messages in the same second would tie and the thread
 * (and its list preview) could show them in either order. Kept as Meta's time, except that a
 * message landing in a second that already holds an equal or later one goes 1 ms after it.
 */
export function orderedAt(at: Date, latestInSecond: Date | null): Date {
  if (!latestInSecond || latestInSecond.getTime() < at.getTime()) return at;
  return new Date(latestInSecond.getTime() + 1);
}

const MEDIA_LABELS: Record<string, string> = ar.inbox.media;

/** Meta's `unsupported` type never arrives. */
export function pushPreview(m: InboundEvent): string {
  if (m.body?.trim()) return m.body.trim();
  if (m.type === 'unsupported') return ar.notifications.unsupported;
  return fill(ar.notifications.media, { kind: MEDIA_LABELS[m.type] ?? ar.inbox.media.other });
}

interface PushInput {
  m: InboundEvent;
  phone: string;
  who: Contact;
  /** Set when this message created the lead (first message from an unknown number). */
  newLeadId: string | null;
  intent: QuickReplyIntent | null;
}

/**
 * How the admin knows this phone: guardian, lead, teacher, WhatsApp profile name, else the number.
 */
const known = <T>(value: T | null | undefined): value is T => value !== null && value !== undefined;

function senderName({ m, phone, who }: Pick<PushInput, 'm' | 'phone' | 'who'>): string {
  return [who.guardian?.name, who.lead?.name, who.teacher?.name, m.name].find(known) ?? phone;
}

/**
 * One push per phone per 10 minutes; a reschedule / stop request gets its own (a burst can't hide
 * it).
 */
function messageSubject({ m, phone, intent }: Pick<PushInput, 'm' | 'phone' | 'intent'>): string {
  if (intent === 'reschedule' || intent === 'stop') return `${phone}:${intent}:${m.waMessageId}`;
  return `${phone}:${Math.floor(m.at.getTime() / PUSH_BUCKET_MS)}`;
}

/** new_lead for an unknown number, else new_message, titled differently for reschedule asks. */
export function inboundPush(input: PushInput): { kind: PushKind; event: PushEvent } {
  const { m, phone, newLeadId } = input;
  const text = pushPreview(m);
  const data = { phone };
  if (newLeadId) return { kind: 'new_lead', event: { subject: newLeadId, vars: { name: m.name ?? phone, text }, data } };
  const name = senderName(input);
  const event: PushEvent = { subject: messageSubject(input), vars: { name, text }, data };
  if (input.intent === 'reschedule') event.title = fill(ar.notifications.rescheduleTitle, { name });
  return { kind: 'new_message', event };
}
