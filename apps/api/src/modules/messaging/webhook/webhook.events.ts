import type { Json } from '@ab/db';
import type { WaLine } from '@ab/shared';

// What the webhook reads out of Meta's envelope (webhook.parse.ts), one item per message / status.

export type MediaType = 'image' | 'audio' | 'video' | 'document' | 'sticker';
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
  /** The receiving line; null unless the chat line is configured (docs/12 §13.2). */
  line: WaLine | null;
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
  line?: WaLine | null;
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
  line: WaLine | null;
  numberId?: string;
  phoneNumberId?: string;
}

export interface WebhookBatch {
  messages: InboundEvent[];
  statuses: StatusEvent[];
  echoes: EchoEvent[];
}
