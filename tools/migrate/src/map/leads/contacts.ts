// CRM contacts joined with their tags, conversation and messages. Pure; shared by the leads and
// messages mappers so both judge a contact (phone, test row) the same way.
import { normalizeArabic } from '@ab/shared';
import { type CrmTables, crmRef, rowsByAge, text } from '../../sources/crm/rows.ts';
import type { CrmRow, SourceRef } from '../../types.ts';
import { DUMMY_PHONES, type PhoneInfo, toE164 } from './phone.ts';

export interface CrmContact {
  id: string;
  ref: SourceRef;
  /** undefined: phone empty or not E.164-able (A8). */
  phone: PhoneInfo | undefined;
  /** null when blank or just the number (WhatsApp profile without a name). */
  name: string | null;
  /** Tag names, sorted. */
  tags: string[];
  createdAt: string | null;
  /** A6: dummy number or a test name. */
  test: boolean;
}

export interface CrmIndex {
  contacts: Map<string, CrmContact>;
  /** conversation id → contact id. */
  contactOf: Map<string, string>;
  /** contact id → its messages, oldest first. */
  messages: Map<string, CrmRow[]>;
}

const TEST_NAME = /\b(?:test|lorem)\b|تجربه|اختبار|نمنم/;

/** A6 test row: dummy number or a test name (Lorem / TEST / تجربة / اختبار / نمنم). */
export function isTestRow(o: { name: string | null; phone: PhoneInfo | undefined }): boolean {
  return (
    (o.phone !== undefined && DUMMY_PHONES.has(o.phone.e164)) ||
    TEST_NAME.test(normalizeArabic(o.name ?? ''))
  );
}

function contactName(row: CrmRow): string | null {
  const name = text(row, 'name');
  if (!name) return null;
  return name.replace(/\D/g, '') === (text(row, 'phone') ?? '').replace(/\D/g, '') ? null : name;
}

function push<V>(map: Map<string, V[]>, key: string | null | undefined, value: V): void {
  if (!key) return;
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function tagsByContact(crm: CrmTables): Map<string, string[]> {
  const names = new Map((crm['tags'] ?? []).map((t) => [text(t, 'id'), text(t, 'name')]));
  const out = new Map<string, string[]>();
  for (const ct of crm['contact_tags'] ?? []) {
    const tag = names.get(text(ct, 'tag_id'));
    if (tag) push(out, text(ct, 'contact_id'), tag);
  }
  return out;
}

function contactFrom(row: CrmRow, tags: readonly string[]): CrmContact {
  const phone = toE164(text(row, 'phone') ?? text(row, 'phone_normalized'));
  const name = contactName(row);
  return {
    id: text(row, 'id') ?? '',
    ref: crmRef('contacts', row),
    phone,
    name,
    tags: [...new Set(tags)].sort(),
    createdAt: text(row, 'created_at'),
    test: isTestRow({ name, phone }),
  };
}

function contactOfConversation(crm: CrmTables): Map<string, string> {
  const contactOf = new Map<string, string>();
  for (const c of crm['conversations'] ?? []) {
    const id = text(c, 'id');
    const contact = text(c, 'contact_id');
    if (id && contact) contactOf.set(id, contact);
  }
  return contactOf;
}

export function crmIndex(crm: CrmTables): CrmIndex {
  const tags = tagsByContact(crm);
  const contacts = new Map<string, CrmContact>();
  for (const row of crm['contacts'] ?? []) {
    const c = contactFrom(row, tags.get(text(row, 'id') ?? '') ?? []);
    if (c.id) contacts.set(c.id, c);
  }
  const contactOf = contactOfConversation(crm);
  const messages = new Map<string, CrmRow[]>();
  for (const m of rowsByAge(crm, 'messages'))
    push(messages, contactOf.get(text(m, 'conversation_id') ?? ''), m);
  return { contacts, contactOf, messages };
}
