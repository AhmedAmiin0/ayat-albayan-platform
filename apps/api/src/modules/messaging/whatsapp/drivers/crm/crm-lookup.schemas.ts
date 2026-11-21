import { z } from 'zod';

// What the CRM's read-only API answers (docs/19 «Confirming an uncertain send»), as the confirm
// reads it. crm-http.ts crmJson already unwraps the envelope's `data`.

/** One message of GET /conversations/{id}/messages (newest first). */
const crmMessageSchema = z.object({
  id: z.string(),
  conversation_id: z.string(),
  direction: z.enum(['inbound', 'outbound']),
  content_text: z.string().nullish(),
  template_name: z.string().nullish(),
  whatsapp_message_id: z.string().nullish(),
  status: z.string().nullish(),
  created_at: z.coerce.date(),
  /** A file's link (the CRM's public chat-media copy), its type when the CRM says it. */
  content_type: z.string().nullish(),
  media_url: z.string().nullish(),
  media_type: z.string().nullish(),
});
export type CrmMessage = z.infer<typeof crmMessageSchema>;

/** Every item that reads as a message; one the CRM shapes otherwise is left out, never guessed. */
export const crmMessagesSchema = z
  .array(z.unknown())
  .transform((items) => items.flatMap((i) => crmMessageSchema.safeParse(i).data ?? []));

/** GET /conversations/{id}: only its contact's phone (it may come without the +). */
export const crmConversationSchema = z.object({
  id: z.string(),
  contact: z.object({ phone: z.string().nullish() }).nullish(),
});
export type CrmConversation = z.infer<typeof crmConversationSchema>;

/** GET /contacts?search=…: ids and phones. */
export const crmContactsSchema = z.array(z.object({ id: z.string(), phone: z.string().nullish() }));
export type CrmContact = z.infer<typeof crmContactsSchema>[number];

/** GET /conversations?contact_id=…: their ids. */
export const crmConversationsSchema = z.array(z.object({ id: z.string() }));

/** GET /contacts/{id}: the phone (it may come without the +) and the name. */
export const crmContactSchema = z.object({
  id: z.string(),
  phone: z.string().nullish(),
  name: z.string().nullish(),
});
export type CrmContactCard = z.infer<typeof crmContactSchema>;
