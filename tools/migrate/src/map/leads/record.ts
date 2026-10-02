// One leads row from a CRM contact (+ its sheet row) or from a sheet row alone. Pure.
import type { Enums } from '@ab/db';
import { TAG_PRECEDENCE, leadStatusFromTags } from '../../sources/crm.schema.ts';
import { text } from '../../sources/crm/rows.ts';
import { zonedToUtc } from '../../time.ts';
import type { ColumnValue, CrmRow, TargetRecord } from '../../types.ts';
import type { CrmContact } from './contacts.ts';
import type { PhoneInfo } from './phone.ts';
import type { SheetLead } from './sheet-leads.ts';

type LeadStatus = Enums<'lead_status'>;

/**
 * The most informative status: a CRM status tag, else the sheet's, else 'new'. «جديد» is what the
 * CRM tags every new chat with, so it never hides a sheet status such as حجز مؤكد.
 */
export function leadStatus(
  tags: readonly string[],
  sheet: SheetLead['status'] | undefined,
): LeadStatus {
  const fromSheet = sheet === 'job_applicant' ? undefined : sheet;
  return [leadStatusFromTags(tags), fromSheet].find((s) => s && s !== 'new') ?? 'new';
}

/** Tags that are not statuses (whatsapp, imported, مشكلة تقنية) are kept for the owner. */
const STATUS_TAGS: ReadonlySet<string> = new Set(TAG_PRECEDENCE);

/** Last inbound (customer) and outbound (agent/bot) message times. */
export function lastMessageTimes(messages: readonly CrmRow[]): Record<string, string | null> {
  const latest = (inbound: boolean): string | null =>
    messages
      .filter((m) => (text(m, 'sender_type') === 'customer') === inbound)
      .flatMap((m) => text(m, 'created_at') ?? [])
      .sort()
      .at(-1) ?? null;
  return { last_inbound_at: latest(true), last_outbound_at: latest(false) };
}

function qualification(o: {
  tags: readonly string[];
  sheet: SheetLead | undefined;
  hints: readonly string[];
}): Record<string, ColumnValue> {
  const q: Record<string, ColumnValue> = {};
  const crmTags = o.tags.filter((t) => !STATUS_TAGS.has(t));
  if (crmTags.length) q['crm_tags'] = crmTags;
  if (o.sheet?.summary) q['legacy_summary'] = o.sheet.summary;
  if (o.sheet?.agreedSlot) q['agreed_slot'] = o.sheet.agreedSlot;
  if (o.hints.length) q['job_seeker_hints'] = [...o.hints];
  return q;
}

function base(phone: PhoneInfo, sheet: SheetLead | undefined): Record<string, ColumnValue> {
  return {
    phone_e164: phone.e164,
    source: sheet?.source ?? 'whatsapp_direct',
    tz: phone.tz,
  };
}

export interface CrmLeadInput {
  contact: CrmContact & { phone: PhoneInfo };
  sheet: SheetLead | undefined;
  messages: readonly CrmRow[];
  hints: readonly string[];
}

export function crmLeadRecord(o: CrmLeadInput): TargetRecord {
  const { contact, sheet } = o;
  return {
    columns: {
      ...base(contact.phone, sheet),
      name: contact.name ?? sheet?.name ?? null,
      status: leadStatus(contact.tags, sheet?.status),
      qualification: qualification({ tags: contact.tags, sheet, hints: o.hints }),
      ...lastMessageTimes(o.messages),
      ...(contact.createdAt ? { created_at: contact.createdAt } : {}),
    },
    refs: {},
  };
}

/** Sheet-only lead (phone not in the CRM). Its date is a Riyadh wall-clock day. */
export function sheetLeadRecord(sheet: SheetLead): TargetRecord {
  const created = sheet.date
    ? zonedToUtc({ date: sheet.date, time: '00:00', tz: 'Asia/Riyadh' }).toISOString()
    : undefined;
  return {
    columns: {
      ...base(sheet.phone, sheet),
      name: sheet.name,
      status: leadStatus([], sheet.status),
      qualification: qualification({ tags: [], sheet, hints: [] }),
      ...(created ? { created_at: created } : {}),
    },
    refs: {},
  };
}
