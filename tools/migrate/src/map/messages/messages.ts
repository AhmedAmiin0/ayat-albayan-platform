// messages ← CRM messages: the WhatsApp history behind the inbox (R-MSG-04, docs/12 §2).
// wa_message_id = Meta wamid: the natural key and adoptBy column, so a message the webhook already
// stored is adopted, never duplicated. Imported rows are history: never 'queued', so the sender
// (which only picks queued rows) can never send one again.
import type { Enums } from '@ab/db';
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { MESSAGE_STATUS, SENDER_DIRECTION } from '../../sources/crm.schema.ts';
import { crmRef, rowsByAge, text } from '../../sources/crm/rows.ts';
import type { ColumnValue, CrmRow, Mapped, NaturalKey, RowIssue, SourceRef } from '../../types.ts';
import { type CrmIndex, crmIndex } from '../leads/contacts.ts';
import { templateKeyFor } from '../templates/templates.ts';

interface Ctx {
  idx: CrmIndex;
  leads: ReadonlySet<string>;
  guardians: ReadonlySet<string>;
  /** CRM message id → wamid, for replies (reply_to_wa_id). */
  wamidOf: ReadonlyMap<string, string>;
}

/**
 * Text, else the caption-less media's CRM URL (kept to fetch into Storage later; the content check
 * needs a body on outbound rows without media_path), else a type marker such as '[audio]'.
 */
export function messageBody(row: CrmRow): string {
  return (
    text(row, 'content_text') ??
    text(row, 'media_url') ??
    `[${text(row, 'content_type') ?? 'unknown'}]`
  );
}

/** Lead or guardian of the phone (a guardian's phone never has a lead). */
function personRefs(e164: string, ctx: Ctx): Record<string, NaturalKey> {
  if (ctx.guardians.has(e164)) return { guardian_id: keys.guardian(e164) };
  if (ctx.leads.has(e164)) return { lead_id: keys.lead(e164) };
  return {};
}

interface Valid {
  e164: string;
  direction: Enums<'message_direction'>;
  status: Enums<'message_status'>;
  createdAt: string;
}

const field = (row: CrmRow, col: string): string => text(row, col) ?? '';

/** The row's phone, direction, status and time — or why it cannot be imported. */
function check(row: CrmRow, ctx: Ctx): Valid | Pick<RowIssue, 'code' | 'field'> {
  const contact = ctx.idx.contacts.get(ctx.idx.contactOf.get(field(row, 'conversation_id')) ?? '');
  if (!contact) return { code: 'missing_field', field: 'conversation_id' };
  if (!contact.phone) return { code: 'bad_phone', field: 'phone' };
  if (contact.test) return { code: 'test_row', field: 'phone' };
  const direction = SENDER_DIRECTION[field(row, 'sender_type')];
  if (!direction) return { code: 'unmapped_value', field: 'sender_type' };
  const status = MESSAGE_STATUS[field(row, 'status')];
  if (!status) return { code: 'unmapped_value', field: 'status' };
  const createdAt = text(row, 'created_at');
  if (!createdAt) return { code: 'missing_field', field: 'created_at' };
  return { e164: contact.phone.e164, direction, status, createdAt };
}

function columnsOf(row: CrmRow, v: Valid, ctx: Ctx): Record<string, ColumnValue> {
  const template = text(row, 'template_name');
  const outbound = v.direction === 'outbound';
  return {
    direction: v.direction,
    phone_e164: v.e164,
    template_key: template ? templateKeyFor(template) : null,
    body: messageBody(row),
    wa_message_id: text(row, 'message_id'),
    status: v.status,
    created_at: v.createdAt,
    sent_at: outbound && v.status !== 'failed' ? v.createdAt : null,
    // Inbound read_at = an admin opened it: imported history counts as read (the CRM's unread
    // counters never reset, so they carry no signal). Outbound read time is unknown.
    read_at: outbound ? null : v.createdAt,
    media_mime: text(row, 'media_type'),
    reply_to_wa_id: ctx.wamidOf.get(field(row, 'reply_to_message_id')) ?? null,
  };
}

function mapMessage(row: CrmRow, ctx: Ctx): Mapped {
  const ref: SourceRef = crmRef('messages', row);
  const v = check(row, ctx);
  if ('code' in v)
    return { ok: false, ref, issues: [{ entity: 'messages', severity: 'reject', ref, ...v }] };
  const key = keys.message({ waMessageId: text(row, 'message_id'), crmId: field(row, 'id') });
  const value = { columns: columnsOf(row, v, ctx), refs: personRefs(v.e164, ctx) };
  return { ok: true, key, value, ref, issues: [] };
}

export function mapMessages(bundle: SourceBundle): Mapped[] {
  const rows = rowsByAge(bundle.crm, 'messages');
  const wamidOf = new Map<string, string>();
  for (const r of rows) {
    const id = text(r, 'id');
    const wamid = text(r, 'message_id');
    if (id && wamid) wamidOf.set(id, wamid);
  }
  const ctx: Ctx = {
    idx: crmIndex(bundle.crm),
    leads: new Set((bundle.earlier.get('leads') ?? []).map((d) => d.key.key)),
    guardians: new Set((bundle.earlier.get('guardians') ?? []).map((d) => d.key.key)),
    wamidOf,
  };
  return rows.map((r) => mapMessage(r, ctx));
}

export const messagesModule: EntityModule = {
  entity: 'messages',
  table: 'messages',
  adoptBy: 'wa_message_id',
  map: mapMessages,
};
