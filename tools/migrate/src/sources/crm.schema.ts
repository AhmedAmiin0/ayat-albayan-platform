// Owner's WhatsApp CRM ("wacrm", a Supabase project; URL in crm.env): the tables we read and their
// columns (PostgREST OpenAPI, 2026-10-02). Multi-tenant: every read filters account_id.
// Counts then: contacts 1230 · conversations 804 · messages 8267 · contact_tags 1047 · tags 9 ·
// message_templates 9 · quick_replies 5 · custom_fields 3 (contact_notes, deals, values: 0).
import type { Enums } from '@ab/db';

export interface CrmTableSpec {
  table: string;
  /** PostgREST select. Tables without account_id filter through an !inner embed. */
  select: string;
  /** Column to filter on the account: 'account_id' or an embedded path. */
  account: string;
  /** Monotonic column for --since deltas and stable paging (with id). */
  cursor: string;
}

export const CRM_TABLES: readonly CrmTableSpec[] = [
  {
    // phone: digits without + (858 × 12 digits, 132 × 11, 5 empty); phone_normalized same digits.
    table: 'contacts',
    select: 'id,phone,phone_normalized,name,email,company,created_at,updated_at',
    account: 'account_id',
    cursor: 'updated_at',
  },
  {
    // status: always 'open'. ai_handoff_summary → leads.qualification.crm_summary.
    table: 'conversations',
    select:
      'id,contact_id,status,assigned_agent_id,last_message_text,last_message_at,unread_count,created_at,updated_at,ai_handoff_summary',
    account: 'account_id',
    cursor: 'updated_at',
  },
  {
    // sender_type customer|agent|bot · content_type text|template|image|audio|document|video|interactive
    // status delivered|read|failed|sent · message_id = Meta wamid · media_url = CRM storage (not copied).
    table: 'messages',
    select:
      'id,conversation_id,sender_type,content_type,content_text,media_url,media_type,template_name,message_id,status,created_at,reply_to_message_id,ai_generated,conversations!inner(account_id)',
    account: 'conversations.account_id',
    cursor: 'created_at',
  },
  {
    table: 'tags',
    select: 'id,name,color,created_at',
    account: 'account_id',
    cursor: 'created_at',
  },
  {
    table: 'contact_tags',
    select: 'id,contact_id,tag_id,created_at,contacts!inner(account_id)',
    account: 'contacts.account_id',
    cursor: 'created_at',
  },
  {
    // 7 APPROVED + 2 PENDING_DELETION, all Utility / ar.
    table: 'message_templates',
    select:
      'id,name,category,language,header_type,header_content,body_text,footer_text,buttons,status,sample_values,meta_template_id,updated_at,created_at',
    account: 'account_id',
    cursor: 'updated_at',
  },
  {
    table: 'quick_replies',
    select: 'id,title,kind,content_text,interactive_payload,created_at,updated_at',
    account: 'account_id',
    cursor: 'updated_at',
  },
  // اسم الطالب · العمر · الوقت المناسب — no values stored yet (contact_custom_values = 0).
  {
    table: 'custom_fields',
    select: 'id,field_name,field_type,created_at',
    account: 'account_id',
    cursor: 'created_at',
  },
  // Sales pipelines. Not mapped: no deals reference them (deals = 0), lead status comes from tags.
  { table: 'pipelines', select: 'id,name,created_at', account: 'account_id', cursor: 'created_at' },
  {
    table: 'pipeline_stages',
    select: 'id,pipeline_id,name,position,created_at,pipelines!inner(account_id)',
    account: 'pipelines.account_id',
    cursor: 'created_at',
  },
];

/**
 * CRM tag → lead_status. A contact with several tags takes the first in TAG_PRECEDENCE.
 * «مشكلة تقنية», «whatsapp», «imported» are not statuses (kept in qualification.crm_tags).
 */
export const TAG_LEAD_STATUS: Record<string, Enums<'lead_status'>> = {
  مشترك: 'converted',
  'حضر التجربة': 'trial_done',
  'تجريبي محجوز': 'trial_booked',
  'محتاج متابعة': 'interested_no_slot',
  'مش مهتم': 'lost',
  جديد: 'new',
};
export const TAG_PRECEDENCE = [
  'مشترك',
  'حضر التجربة',
  'تجريبي محجوز',
  'محتاج متابعة',
  'مش مهتم',
  'جديد',
] as const;

/** Highest-precedence status among a contact's tag names; undefined when none is a status tag. */
export function leadStatusFromTags(tagNames: readonly string[]): Enums<'lead_status'> | undefined {
  const top = TAG_PRECEDENCE.find((t) => tagNames.includes(t));
  return top ? TAG_LEAD_STATUS[top] : undefined;
}

/** messages.sender_type → direction. */
export const SENDER_DIRECTION: Record<string, Enums<'message_direction'>> = {
  customer: 'inbound',
  agent: 'outbound',
  bot: 'outbound',
};

/** CRM message status → message_status (same vocabulary). */
export const MESSAGE_STATUS: Record<string, Enums<'message_status'>> = {
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'failed',
};
