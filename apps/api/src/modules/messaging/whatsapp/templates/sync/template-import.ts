import type { TablesInsert } from '@ab/db';
import {
  BODY_SLOTS,
  RESTRICTED_TEMPLATE_DEFAULTS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_KEY_PATTERN,
  type TemplateCategory,
  type TemplateSkip,
  type TemplateSkipReason,
  type WaLine,
} from '@ab/shared';
import { components, metaButtons, ourStatus, type Component } from './template-sync';
import type { MetaTemplate, TemplateRow } from '../../whatsapp.types';

// One line's sync, pure part (owner 2026-10-12, 2026-10-18, docs/12 §3.4): an approved template on a
// line's WABA the registry does not know becomes a row on THAT line; on the restricted allow-list only
// when it comes from the chat WABA and is one of RESTRICTED_TEMPLATE_DEFAULTS (a notifications import
// is never flagged). Only what the sender and the composers can send is imported; the rest is skipped
// with a reason, returned to the admin.

export type ImportRow = TablesInsert<'message_templates'>;

interface ImportPlan {
  rows: ImportRow[];
  /** Returned by the line's sync: not imported, and why. */
  skipped: TemplateSkip[];
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

/** Only a restricted default from the chat WABA comes on the allow-list. */
const flagged = (line: WaLine, name: string): boolean => line === 'chat' && (RESTRICTED_TEMPLATE_DEFAULTS as readonly string[]).includes(name);

/** A skip reason, not a row: rows never carry `code`. */
const isSkip = (r: ImportRow | TemplateSkipReason): r is TemplateSkipReason => 'code' in r;

/** The registry row for one template of `line`'s WABA, or the reason code it is not imported. */
export function starterRow(meta: MetaTemplate, now: Date, line: WaLine = 'chat'): ImportRow | TemplateSkipReason {
  const category = meta.category.toLowerCase();
  // An authentication template (account_code, docs/30) is never a chat starter: only our own seeded row sends one.
  if (!isCategory(category) || category === 'authentication') return { code: 'category', category: meta.category };
  if (!TEMPLATE_KEY_PATTERN.test(meta.name)) return { code: 'bad_key' };
  const comps = components(meta.components);
  if (!headerOk(comps)) return { code: 'media_header' };
  const body = comps.find((c) => c.type === 'BODY')?.text;
  if (!body) return { code: 'no_body' };
  const n = varCount(body);
  if (n === null) return { code: 'named_vars' };
  if (n > BODY_SLOTS.length) return { code: 'too_many_vars', max: BODY_SLOTS.length };
  const buttons = importButtons(comps);
  if (!buttons) return { code: 'button_value' };
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
    line,
    // The allow-list's defaults from the chat WABA only; after the import the admin's toggle decides.
    sales_starter: flagged(line, meta.name),
  };
}

interface StarterInput {
  meta: readonly MetaTemplate[];
  /** Every registry row, of both lines: one Meta name + language is one row (unique). */
  known: readonly TemplateRow[];
  now: Date;
  /** The WABA's line; chat when absent. */
  line?: WaLine;
}

/**
 * Every approved template of one WABA the registry does not know by Meta name + language (a known one
 * is a sync's), each once. key = the Meta name, so a name whose key is taken is skipped.
 */
export function newStarters(input: StarterInput): ImportPlan {
  const plan: ImportPlan = { rows: [], skipped: [] };
  const keys = new Set(input.known.map((r) => r.key));
  const synced = new Set(input.known.map((r) => `${r.meta_name}:${r.language}`));
  for (const meta of input.meta) {
    if (ourStatus(meta.status) !== 'approved' || synced.has(`${meta.name}:${meta.language}`)) continue;
    const row: ImportRow | TemplateSkipReason = keys.has(meta.name) ? { code: 'key_taken' } : starterRow(meta, input.now, input.line);
    if (isSkip(row)) {
      plan.skipped.push({ name: `${meta.name} (${meta.language})`, reason: row });
      continue;
    }
    keys.add(row.key);
    plan.rows.push(row);
  }
  return plan;
}
