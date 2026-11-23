// Test fixtures (not shipped behaviour): a queued CRM message.received and its CRM answers.
// Fake ids and the +9665000000nn test range only: never a real number.
import type { Tables } from '@ab/db';
import type { CrmMessage } from '@/modules/messaging/whatsapp';

export const WAMID = 'wamid.crm-in-1';
export const RECEIVED_AT = '2026-11-21T09:00:00.000Z';
export const MEDIA_LINK =
  'https://crm.example.test/storage/v1/object/public/chat-media/acct/wamid-photo.jpg';

export const queued = (over: Partial<Tables<'crm_inbound_queue'>> = {}) => ({
  wa_message_id: WAMID,
  conversation_id: 'cv-1',
  contact_id: 'ct-1',
  content_type: 'text',
  body: 'السلام عليكم',
  received_at: RECEIVED_AT,
  attempts: 0,
  next_at: RECEIVED_AT,
  last_error: null,
  created_at: RECEIVED_AT,
  ...over,
});

export const contactCard = (over: Record<string, unknown> = {}) => ({
  id: 'ct-1',
  phone: '966500000001',
  name: 'أم أحمد',
  ...over,
});

export const crmItem = (over: Partial<CrmMessage> = {}): CrmMessage => ({
  id: 'm-1',
  conversation_id: 'cv-1',
  direction: 'inbound',
  content_text: null,
  template_name: null,
  whatsapp_message_id: WAMID,
  status: 'delivered',
  created_at: new Date(RECEIVED_AT),
  content_type: 'image',
  media_url: MEDIA_LINK,
  media_type: null,
  ...over,
});
