import { NOTIFICATION_CATALOGUE, routeSession, routeTemplate, type RoutableNumber, type WaLine } from '@ab/shared';
import type { OverlayNumber } from '../../common/integrations/numbers-overlay';
import type { DueMessage } from './sender.due';
import type { TemplateRow } from './whatsapp.types';

// Module mode's per-row number pick (docs/23 phase 5, contract docs/23c decisions 3–5). Pure: the
// sender loads a RoutePass once per pass and asks routeOf() for every due row. Legacy never gets here.

/** The number a row leaves from, and its role (stamped as messages.line at claim, decision 8). */
export interface NumberRoute {
  numberId: string;
  line: WaLine;
}

/** template key → number id → message_template_numbers.status. */
export type Approvals = ReadonlyMap<string, ReadonlyMap<string, string>>;

/** What one pass routes with. */
export interface RoutePass {
  numbers: readonly RoutableNumber[];
  /** template key → its catalogue row's notification_rules.number_id (absent / null = none chosen). */
  ruleNumbers: ReadonlyMap<string, string | null>;
  approvals: Approvals;
}

/** An overlay number as routing sees it: sendable = enabled with a working config of its own. */
export function routable(n: OverlayNumber): RoutableNumber {
  const { id, purpose, enabled, is_default, fallback_rank, created_at } = n;
  return { id, purpose, enabled, is_default, fallback_rank, created_at, sendable: enabled && n.env !== null };
}

/**
 * Template key → the number of the FIRST non-manual catalogue entry whose templates list it (its
 * stored notification_rules row's number_id; null when the row or its number is unset).
 */
export function ruleNumbers(numberOf: (entryKey: string) => string | null): Map<string, string | null> {
  const out = new Map<string, string | null>();
  for (const entry of NOTIFICATION_CATALOGUE) {
    if (entry.manual) continue;
    for (const key of entry.templates) if (!out.has(key)) out.set(key, numberOf(entry.key));
  }
  return out;
}

/**
 * Decision 4: approved on a number = its message_template_numbers row says approved; with no row yet,
 * the role's default number counts as approved when message_templates.status is approved.
 */
export function approvedOn(pass: RoutePass, template: Pick<TemplateRow, 'key' | 'line' | 'status'>): (id: string) => boolean {
  const rows = pass.approvals.get(template.key);
  const fallback = pass.numbers.find((n) => n.purpose === template.line && n.is_default)?.id;
  return (id) => {
    const status = rows?.get(id);
    if (status !== undefined) return status === 'approved';
    return id === fallback && template.status === 'approved';
  };
}

/** The row's number now; null = none can send it (it stays queued, untouched). Sessions never fall back. */
export function routeOf(pass: RoutePass, at: { row: DueMessage; template: TemplateRow | null }): NumberRoute | null {
  const { row, template } = at;
  let id: string | null;
  if (row.template_key) {
    if (!template) return null;
    id = routeTemplate({
      numbers: pass.numbers,
      ruleNumberId: pass.ruleNumbers.get(template.key) ?? null,
      templateNumberId: template.number_id,
      line: template.line,
      approvedOn: approvedOn(pass, template),
    });
  } else {
    id = routeSession(pass.numbers, { numberId: row.number_id, line: row.line ?? 'notifications' });
  }
  const n = id === null ? undefined : pass.numbers.find((x) => x.id === id);
  return n ? { numberId: n.id, line: n.purpose } : null;
}
