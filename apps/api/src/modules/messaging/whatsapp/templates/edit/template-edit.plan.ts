import type { Json } from '@ab/db';
import {
  codeBoundProblem, editLimitReason, editRoute, isCodeBound, nextEditAt, recentEdits,
  type EditRoute, type TemplateEditInput,
} from '@ab/shared';
import { templateProblem } from '@/modules/messaging/whatsapp/template-review';
import { paramNames } from '@/modules/messaging/whatsapp/messages/wa-json';
import type { TemplatePatch } from '@/modules/messaging/whatsapp/templates/sync/template-sync';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import {
  displayAfter, hasForeignButtons, registryAfter, reworded, shownButtons,
} from './template-edit.buttons';

// One edit of a template's words (owner 2026-11-14), pure: Meta's rules (which statuses, how often,
// back to review), the code-bound rule (same variables and buttons), and Meta's body rules.

export type EditRefusalCode =
  | 'not_editable' | 'edit_daily_limit' | 'edit_monthly_limit' | 'buttons_unsupported'
  | 'code_bound_variables' | 'code_bound_buttons' | 'reply_intent_required' | 'invalid_template';

export interface EditRefusal {
  refused: EditRefusalCode;
  route?: undefined;
  details?: Record<string, unknown>;
}

export interface EditPlan {
  refused?: undefined;
  route: EditRoute;
  /** The row as it will be: what Meta's edit is built from. */
  after: TemplateRow;
  patch: TemplatePatch;
}

/** A row Meta never gave an id cannot be edited there: saved here, then submitted. */
const routeOf = (row: TemplateRow): EditRoute | null => {
  const route = editRoute(row.status);
  return route === 'meta' && !row.meta_id ? 'local' : route;
};

/** Status, Meta's edit limits and the buttons the platform cannot write: before the content. */
function gate(row: TemplateRow, now: Date): EditRefusal | null {
  if (!routeOf(row)) return { refused: 'not_editable', details: { status: row.status } };
  const limit = { status: row.status, edits: row.approved_edits, now };
  const reason = editLimitReason(limit);
  if (reason) return { refused: reason, details: { next_at: nextEditAt(limit) } };
  return hasForeignButtons(row) ? { refused: 'buttons_unsupported' } : null;
}

/** A code-bound template: same number of variables, same buttons (types, order, links). */
function boundRefusal(row: TemplateRow, input: TemplateEditInput): EditRefusal | null {
  if (!isCodeBound(row.key)) return null;
  const before = { params: paramNames(row.params).length, buttons: shownButtons(row) };
  const refused = codeBoundProblem(before, { params: input.params.length, buttons: input.buttons });
  return refused ? { refused } : null;
}

/** The row after the edit; a code-bound one keeps its variable names and registry buttons. */
function rowAfter(row: TemplateRow, input: TemplateEditInput): TemplateRow | null {
  const bound = isCodeBound(row.key);
  const buttons = bound ? reworded(row, input.buttons) : registryAfter(row, input.buttons);
  if (!buttons) return null;
  const names = bound ? paramNames(row.params) : input.params.map((p) => p.name);
  return {
    ...row,
    body_ar: input.body,
    footer_ar: input.footer,
    params: names,
    samples: input.params.map((p) => p.sample),
    buttons: buttons as unknown as TemplateRow['buttons'],
    // Plain JSON (strings and arrays); TS cannot see the display interfaces as Json.
    display: displayAfter(row, input.buttons) as unknown as Json,
  };
}

/** Back to review on Meta: pending, the error cleared, an approved edit counted (30 days kept). */
interface PatchInput { after: TemplateRow; route: EditRoute; now: Date }

function patchOf(row: TemplateRow, next: PatchInput): TemplatePatch {
  const { after, route, now } = next;
  const { body_ar, footer_ar, params, samples, buttons, display } = after;
  const content = { body_ar, footer_ar, params, samples, buttons, display };
  if (route === 'local') return content;
  const kept = recentEdits(row.approved_edits, now);
  const edits = row.status === 'approved' ? [...kept, now.toISOString()] : kept;
  const review = { status: 'pending' as const, last_error: null, submitted_at: now.toISOString() };
  return { ...content, ...review, approved_edits: edits };
}

/** The new content, or why Meta (or the sender) would refuse it. */
function content(row: TemplateRow, input: TemplateEditInput): TemplateRow | EditRefusal {
  const after = rowAfter(row, input);
  if (!after) return { refused: 'reply_intent_required' };
  const problem = templateProblem(after);
  return problem ? { refused: 'invalid_template', details: { reason: problem } } : after;
}

/** The edit, or why it is refused (EditRefusal: the caller answers 409 with the MSA reason). */
export function planEdit(
  row: TemplateRow,
  input: TemplateEditInput,
  now: Date,
): EditPlan | EditRefusal {
  const route = routeOf(row) ?? 'local';
  const early = gate(row, now) ?? boundRefusal(row, input);
  if (early) return early;
  const after = content(row, input);
  if (isRefusal(after)) return after;
  return { route, after, patch: patchOf(row, { after, route, now }) };
}

export function isRefusal(p: EditPlan | TemplateRow | EditRefusal): p is EditRefusal {
  return (p as { refused?: unknown }).refused !== undefined;
}
