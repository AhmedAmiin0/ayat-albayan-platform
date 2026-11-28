import type { TablesInsert } from '@ab/db';
import {
  BODY_SLOTS,
  RESTRICTED_TEMPLATE_DEFAULTS,
  TEMPLATE_KEY_PATTERN,
  type TemplateButton,
  type TemplateSkip,
  type TemplateSkipReason,
} from '@ab/shared';
import type { TemplateCategory, WaLine } from '@ab/catalog';
import { components, ourStatus, type Component } from './template-sync';
import { headerOk, importButtons, isStarterCategory, varCount } from './import-checks';
import { metaDisplay } from './template-display';
import { wabaNames } from '@/modules/messaging/whatsapp/templates/names/template-waba-match';
import type { MetaTemplate, TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';

// One line's sync, pure part (docs/12 §3.4): an approved template on a
// line's WABA the registry does not know becomes a row on THAT line; on the restricted allow-list
// only when it comes from the chat WABA and is one of RESTRICTED_TEMPLATE_DEFAULTS (a notifications
// import is never flagged). Only what the sender and the composers can send is imported; the rest
// is skipped with a reason, returned to the admin.

export type ImportRow = TablesInsert<'message_templates'>;

interface ImportPlan {
  rows: ImportRow[];
  /** Returned by the line's sync: not imported, and why. */
  skipped: TemplateSkip[];
}

/** Only a restricted default from the chat WABA comes on the allow-list. */
const flagged = (line: WaLine, name: string): boolean => line === 'chat' && (RESTRICTED_TEMPLATE_DEFAULTS as readonly string[]).includes(name);

type Planned = { ok: true; row: ImportRow } | { ok: false; reason: TemplateSkipReason };
const skip = (reason: TemplateSkipReason): Planned => ({ ok: false, reason });

interface Draft {
  meta: MetaTemplate;
  category: TemplateCategory;
  now: Date;
  line: WaLine;
}
type Ready = Draft & { comps: Component[]; body: string; n: number; buttons: TemplateButton[] };

/** The registry row for one template of `line`'s WABA, or the reason code it is not imported. */
export function starterRow(
  meta: MetaTemplate,
  now: Date,
  line: WaLine = 'chat',
): ImportRow | TemplateSkipReason {
  const planned = plan(meta, now, line);
  return planned.ok ? planned.row : planned.reason;
}

function plan(meta: MetaTemplate, now: Date, line: WaLine): Planned {
  const category = meta.category.toLowerCase();
  if (!isStarterCategory(category)) return skip({ code: 'category', category: meta.category });
  if (!TEMPLATE_KEY_PATTERN.test(meta.name)) return skip({ code: 'bad_key' });
  return withBody({ meta, category, now, line });
}

function withBody(draft: Draft): Planned {
  const comps = components(draft.meta.components);
  if (!headerOk(comps)) return skip({ code: 'media_header' });
  const body = comps.find((c) => c.type === 'BODY')?.text;
  if (!body) return skip({ code: 'no_body' });
  return withVars(draft, comps, body);
}

function withVars(draft: Draft, comps: Component[], body: string): Planned {
  const n = varCount(body);
  if (n === null) return skip({ code: 'named_vars' });
  if (n > BODY_SLOTS.length) return skip({ code: 'too_many_vars', max: BODY_SLOTS.length });
  const buttons = importButtons(comps);
  if (!buttons) return skip({ code: 'button_value' });
  return { ok: true, row: rowOf({ ...draft, comps, body, n, buttons }) };
}

function rowOf(r: Ready): ImportRow {
  return {
    key: r.meta.name,
    meta_name: r.meta.name,
    language: r.meta.language,
    category: r.category,
    body_ar: r.body,
    footer_ar: r.comps.find((c) => c.type === 'FOOTER')?.text ?? null,
    // Labelled as numbered variables like tools/migrate's CRM import.
    params: Array.from({ length: r.n }, (_, i) => `var_${i + 1}`),
    buttons: r.buttons,
    display: metaDisplay(r.comps),
    status: 'approved',
    quality: r.meta.quality,
    meta_id: r.meta.id,
    last_checked_at: r.now.toISOString(),
    line: r.line,
    // The chat WABA's allow-list defaults only; after the import the admin's toggle decides.
    sales_starter: flagged(r.line, r.meta.name),
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
 * Every approved template of one WABA the registry does not know by Meta name + language, nor as a
 * row's WABA name (template-waba-match.ts: a known one is a sync's), each once. key = the Meta
 * name, so a name whose key is taken is skipped.
 */
export function newStarters(input: StarterInput): ImportPlan {
  const plan: ImportPlan = { rows: [], skipped: [] };
  const keys = new Set(input.known.map((r) => r.key));
  const synced = new Set(input.known.flatMap(wabaNames));
  const unknown = (meta: MetaTemplate): boolean =>
    ourStatus(meta.status) === 'approved' && !synced.has(`${meta.name}:${meta.language}`);
  for (const meta of input.meta.filter(unknown)) {
    const r = keys.has(meta.name) ? skip({ code: 'key_taken' }) : planOf(meta, input);
    if (!r.ok) {
      plan.skipped.push({ name: `${meta.name} (${meta.language})`, reason: r.reason });
      continue;
    }
    keys.add(r.row.key);
    plan.rows.push(r.row);
  }
  return plan;
}

const planOf = (meta: MetaTemplate, input: StarterInput): Planned =>
  plan(meta, input.now, input.line ?? 'chat');
