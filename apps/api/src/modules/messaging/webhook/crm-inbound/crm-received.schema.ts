import { z } from 'zod';

// The CRM's message.received `data` (wacrm 98b5bd2, src/app/api/whatsapp/webhook/route.ts): its own
// conversation and contact ids, the WhatsApp message id, the content type and the text (a caption
// for media). No phone: the contact is looked up (crm-inbound.service.ts).

const id = z.string().min(1).max(200);

const crmReceivedSchema = z.object({
  conversation_id: id,
  contact_id: id,
  whatsapp_message_id: id,
  content_type: z.string().min(1).max(40),
  text: z.string().max(10_000).nullish(),
});

/** One message a family or teacher sent to the notifications number, as the CRM announced it. */
export interface CrmReceived {
  waMessageId: string;
  conversationId: string;
  contactId: string;
  contentType: string;
  text: string | null;
  at: Date;
}

/** The delivery's data as a CrmReceived; null = not the CRM's shape (never guessed). */
export function parseReceived(data: unknown, at: Date): CrmReceived | null {
  const parsed = crmReceivedSchema.safeParse(data);
  if (!parsed.success) return null;
  const d = parsed.data;
  return {
    waMessageId: d.whatsapp_message_id,
    conversationId: d.conversation_id,
    contactId: d.contact_id,
    contentType: d.content_type,
    text: d.text ?? null,
    at,
  };
}
