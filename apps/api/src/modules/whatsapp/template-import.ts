import type { TablesInsert } from '@ab/db';
import {
  BODY_SLOTS,
  RESTRICTED_TEMPLATE_DEFAULTS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_KEY_PATTERN,
  type TemplateCategory,
} from '@ab/shared';
import { components, metaButtons, ourStatus, type Component } from './template-sync';
import type { MetaTemplate, TemplateRow } from './whatsapp.types';

// The health check per line, pure part (owner 2026-10-12, docs/12 §3.4): which Meta list a row is
// checked against, and the chat line's import: an approved template on the chat WABA the registry
// does not know becomes a row on line 'chat', on the restricted allow-list only when it is one of
// RESTRICTED_TEMPLATE_DEFAULTS (owner 2026-10-12: free_trial_invite, welcome_greeting).
// Only what the sender and the composers can send is imported; the rest is skipped with a reason.

export type ImportRow = TablesInsert<'message_templates'>;

export interface ImportPlan {
  rows: ImportRow[];
  /** Logged by name by the registry: not imported, and why. */
  skipped: { name: string; reason: string }[];
}

/** The Meta lists one health check read. */
export interface MetaLists {
  notifications: readonly MetaTemplate[];
  /** null = not read: the chat line is not configured, or its read failed. */
  chat: readonly MetaTemplate[] | null;
  /** The chat line is configured: chat rows are checked against its list only. */
  chatOn: boolean;
}

/**
 * The list a row is checked against: its own line's. A chat row while the chat line is off is checked
 * against notifications (one line = one WABA, the one it would leave from); null = its list was not
 * read this time, so the row stays as it is (a failed chat read never marks rows missing).
 */
export function listFor(row: Pick<TemplateRow, 'line'>, lists: MetaLists): readonly MetaTemplate[] | null {
  return row.line === 'chat' && lists.chatOn ? lists.chat : lists.notifications;
}

const isCategory = (c: string): c is TemplateCategory => (TEMPLATE_CATEGORIES as readonly string[]).includes(c);

/** The highest numbered {{n}}; null when a variable is named ({{first_name}}): we send by position. */
function varCount(body: string): number | null {
  const vars = [...body.matchAll(/\{\{([^}]*)\}\}/g)].map((m) => (m[1] ?? '').trim());
  if (vars.some((v) => !/^\d+$/.test(v))) return null;
  return Math.max(0, ...vars.map(Number));
}

/** No header, or a plain text one: a media header or a header variable needs a part we never send. */
function headerOk(comps: readonly Component[]): boolean {
  const header = comps.find((c) => c.type === 'HEADER');
  return !header || (header.format?.toUpperCase() === 'TEXT' && !(header.text ?? '').includes('{{'));
}

type MetaButton = NonNullable<Component['buttons']>[number];

/** A button that needs no value at send time: a quick reply, a phone number, a fixed link. */
const valueFree = (b: MetaButton): boolean => {
  const type = b.type.toUpperCase();
  return type === 'QUICK_REPLY' || type === 'PHONE_NUMBER' || (type === 'URL' && !(b.url ?? '').includes('{{'));
};

/**
 * Meta's buttons as ours. A list we cannot model (a reply without a known intent, a phone button) is
 * kept as none when every button needs no value: the send then carries no button part, which Meta
 * accepts (a tap arrives as plain text). null = a button needs a value we cannot send (copy code…).
 */
function importButtons(comps: readonly Component[]) {
  const raw = comps.find((c) => c.type === 'BUTTONS')?.buttons ?? [];
  return metaButtons(comps, []) ?? (raw.every(valueFree) ? [] : null);
}

/** The registry row for one chat-WABA template, or the reason it is not imported. */
export function starterRow(meta: MetaTemplate, now: Date): ImportRow | string {
  const category = meta.category.toLowerCase();
  if (!isCategory(category)) return `category ${meta.category}`;
  if (!TEMPLATE_KEY_PATTERN.test(meta.name)) return 'the name is not a registry key';
  const comps = components(meta.components);
  if (!headerOk(comps)) return 'media or variable header';
  const body = comps.find((c) => c.type === 'BODY')?.text;
  if (!body) return 'no body';
  const n = varCount(body);
  if (n === null) return 'named variables';
  if (n > BODY_SLOTS.length) return `more than ${BODY_SLOTS.length} variables`;
  const buttons = importButtons(comps);
  if (!buttons) return 'a button that needs a value the platform cannot send';
  return {
    key: meta.name,
    meta_name: meta.name,
    language: meta.language,
    category,
    body_ar: body,
    footer_ar: comps.find((c) => c.type === 'FOOTER')?.text ?? null,
    // Like tools/migrate's CRM import: the composers label them «المتغير n».
    params: Array.from({ length: n }, (_, i) => `var_${i + 1}`),
    buttons,
    status: 'approved',
    quality: meta.quality,
    meta_id: meta.id,
    last_checked_at: now.toISOString(),
    line: 'chat',
    // The allow-list's defaults only; after the import the admin's toggle decides (the sync never flags).
    sales_starter: (RESTRICTED_TEMPLATE_DEFAULTS as readonly string[]).includes(meta.name),
  };
}

/**
 * Every approved chat-WABA template the registry does not know by Meta name + language (a known one
 * is the health sync's), each once. key = the Meta name, so a name whose key is taken is skipped.
 */
export function newStarters(input: { meta: readonly MetaTemplate[]; known: readonly TemplateRow[]; now: Date }): ImportPlan {
  const plan: ImportPlan = { rows: [], skipped: [] };
  const keys = new Set(input.known.map((r) => r.key));
  const synced = new Set(input.known.map((r) => `${r.meta_name}:${r.language}`));
  for (const meta of input.meta) {
    if (ourStatus(meta.status) !== 'approved' || synced.has(`${meta.name}:${meta.language}`)) continue;
    const row = keys.has(meta.name) ? `the key ${meta.name} is taken` : starterRow(meta, input.now);
    if (typeof row === 'string') {
      plan.skipped.push({ name: `${meta.name} (${meta.language})`, reason: row });
      continue;
    }
    keys.add(row.key);
    plan.rows.push(row);
  }
  return plan;
}
