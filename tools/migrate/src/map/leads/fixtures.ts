// Invented CRM / sheet rows for the leads, messages and templates tests. No real data.
import type { SourceBundle } from '../../entities/contract.ts';
import type { Desired } from '../../plan/resolve.ts';
import type { ColumnValue, CrmRow, EntityName, SourceRow } from '../../types.ts';

/** WhatsApp ids as the CRM stores them (no '+'). */
export const SA = '966551110001';
export const EG = '201001110002';
export const QA = '97455110003';
export const SA2 = '966551110004';

export function contact(id: string, phone: string, name: string | null = null): CrmRow {
  return { id, phone, phone_normalized: phone, name, created_at: '2026-09-12T08:00:00+00:00' };
}

export interface MessageInput {
  id: string;
  conv: string;
  sender: 'customer' | 'agent' | 'bot' | string;
  at: string;
  text?: string | null;
  type?: string;
  status?: string;
  template?: string;
  wamid?: string | null;
  media?: { url: string; mime: string };
  replyTo?: string;
}

/** Defaults: text body, wamid.<id>, delivered (customer) / read (agent, bot). */
export function message(m: MessageInput): CrmRow {
  const defaults = {
    content_type: m.template ? 'template' : 'text',
    content_text: `text ${m.id}`,
    message_id: `wamid.${m.id}`,
    status: m.sender === 'customer' ? 'delivered' : 'read',
  };
  const given = {
    content_type: m.type,
    content_text: m.text,
    message_id: m.wamid,
    status: m.status,
    media_url: m.media?.url,
    media_type: m.media?.mime,
    template_name: m.template,
    reply_to_message_id: m.replyTo,
  };
  const set = Object.fromEntries(Object.entries(given).filter(([, v]) => v !== undefined));
  return {
    id: m.id,
    conversation_id: m.conv,
    sender_type: m.sender,
    created_at: m.at,
    ...defaults,
    ...set,
  };
}

export interface CrmInput {
  contacts?: CrmRow[];
  /** contact id → tag names. */
  tags?: Record<string, string[]>;
  messages?: CrmRow[];
  templates?: CrmRow[];
}

/** One conversation per contact: conversation id = `c-<contact id>`. */
export function crm(o: CrmInput): Record<string, CrmRow[]> {
  const contacts = o.contacts ?? [];
  const tagNames = [...new Set(Object.values(o.tags ?? {}).flat())];
  return {
    contacts,
    conversations: contacts.map((c) => ({ id: `c-${String(c['id'])}`, contact_id: c['id'] })),
    tags: tagNames.map((name, i) => ({ id: `t${i}`, name })),
    contact_tags: Object.entries(o.tags ?? {}).flatMap(([contactId, names]) =>
      names.map((n) => ({ contact_id: contactId, tag_id: `t${tagNames.indexOf(n)}` })),
    ),
    messages: o.messages ?? [],
    message_templates: o.templates ?? [],
  };
}

export function sheetRow(fields: SourceRow['fields'], row = 2): SourceRow {
  return { ref: { source: 'HUB', tab: 'كل المحادثات', row }, fields };
}

export function desired(
  entity: EntityName,
  key: string,
  columns: Record<string, ColumnValue> = {},
): Desired {
  return {
    key: { entity, key },
    record: { columns, refs: {} },
    hash: key,
    ref: { source: 'HUB', tab: 'x', row: 1 },
  };
}

export function bundle(o: Partial<SourceBundle>): SourceBundle {
  return { sheets: {}, crm: {}, earlier: new Map(), today: '2026-10-02', ...o };
}
