import type { Json } from '@ab/db';
import type { NumberPurpose } from '@ab/shared';

// What the webhook reads out of Meta's envelope (webhook.parse.ts), one item per message / status.

type MediaType = 'image' | 'audio' | 'video' | 'document' | 'sticker';
export const MEDIA_TYPES: readonly MediaType[] = ['image', 'audio', 'video', 'document', 'sticker'];

export interface InboundEvent {
  waMessageId: string;
  /** Meta's wa_id (international digits, no +). */
  from: string;
  /** WhatsApp profile name from value.contacts. */
  name: string | null;
  at: Date;
  type: string;
  /** Text, media caption, button text or interactive reply title. */
  body: string | null;
  /** Our quick-reply payload / interactive reply id (what the sender attached), if any. */
  replyKey: string | null;
  /** context.id: the wamid this message answers. */
  replyTo: string | null;
  mediaId: string | null;
  mediaMime: string | null;
  /** messages.interactive_payload: everything but plain text, as Meta sent it. */
  payload: Json | null;
  /**
   * The receiving line; null unless the chat line is configured (docs/12 §13.2); `calls` = the
   * calls number (docs/28 §10).
   */
  line: NumberPurpose | null;
  /** Module mode only: the receiving wa_numbers row (messages.number_id, docs/23c decision 7). */
  numberId?: string;
  /** Meta's metadata.phone_number_id of the change (stamps number_id under legacy too). */
  phoneNumberId?: string;
}

export const DELIVERY_STATUSES = ['sent', 'delivered', 'read', 'failed'] as const;
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface StatusEvent {
  waMessageId: string;
  status: DeliveryStatus;
  at: Date;
  errorCode: string | null;
  errorText: string | null;
  conversationId: string | null;
  pricingCategory: string | null;
  /** Where the status came in (an unknown wamid on a Kapso number is fetched and stored, external/). */
  line?: NumberPurpose | null;
  numberId?: string;
  phoneNumberId?: string;
}

/**
 * A message the business sent OUTSIDE the app (Kapso's inbox, the WhatsApp Business app): Meta's
 * smb_message_echoes item, or a message read back from Kapso's history. Stored as an outbound row.
 */
export interface EchoEvent {
  /** The Meta message object (id, to, timestamp, type, text / template / media). */
  message: unknown;
  line: NumberPurpose | null;
  numberId?: string;
  phoneNumberId?: string;
}

/**
 * One WhatsApp Calling item (docs/28 §2), from a change whose field is `calls`: a `connect` (an inbound
 * call's offer, or WhatsApp's answer to our outbound offer), a `terminate`, or a call `status`
 * (RINGING / ACCEPTED / REJECTED of our outbound call). Message statuses never come here.
 */
export interface CallWebhookEvent {
  kind: 'connect' | 'terminate' | 'status';
  /** Meta's call id (wacid). */
  waCallId: string;
  /** The receiving number's phone_number_id (metadata); null when Meta left it out. */
  phoneNumberId: string | null;
  /** inbound = USER_INITIATED; outbound = BUSINESS_INITIATED (statuses are always ours). */
  direction: 'inbound' | 'outbound';
  /** The family's wa_id (digits): `from` of an inbound call, `to` / recipient_id of ours. */
  peer: string | null;
  /** session.sdp of a connect (offer inbound, answer outbound). */
  sdp: string | null;
  /** biz_opaque_callback_data: our wa_calls.id on outbound calls. */
  ref: string | null;
  /** Upper case: RINGING / ACCEPTED / REJECTED (status), COMPLETED / FAILED (terminate). */
  status: string | null;
  /** terminate: Meta's talk time in seconds. */
  duration: number | null;
  at: Date;
}

/**
 * A family's answer to a call permission request (a `messages` item, interactive
 * call_permission_reply; docs/28 §10).
 */
export interface CallPermissionReplyEvent {
  /** The number the request went from (metadata.phone_number_id). */
  phoneNumberId: string;
  /** The family's wa_id (digits). */
  from: string;
  response: 'accepted' | 'rejected';
  /** accepted: when the grant lapses; null = permanent or not given. */
  expiresAt: Date | null;
  at: Date;
}

export interface WebhookBatch {
  messages: InboundEvent[];
  statuses: StatusEvent[];
  echoes: EchoEvent[];
  /** Present only when the body carried a `calls` change. */
  calls?: CallWebhookEvent[];
  /** Present only when a `messages` change carried a call_permission_reply. */
  permissions?: CallPermissionReplyEvent[];
}
