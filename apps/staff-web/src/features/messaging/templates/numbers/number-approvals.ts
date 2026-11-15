import type { NumberView, TemplateStatus, TemplateView } from '@ab/shared';

// Per-number approval of one template (docs/23c decisions 3–4), for the «يُرسل من» cell. Pure.

/** A number's approval: Meta's status there, or not synced yet (no message_template_numbers row). */
export type NumberApprovalState = TemplateStatus | 'not_synced';

export interface NumberApprovalRow {
  number: NumberView;
  state: NumberApprovalState;
}

type Tpl = Pick<TemplateView, 'line' | 'status' | 'number_id' | 'numbers'>;

/**
 * The numbers a template may go out from, in routing order: its own number first, then its role's
 * numbers (the default, then fallback_rank). Any other number with a synced row follows.
 */
export function shownNumbers(tpl: Tpl, numbers: readonly NumberView[]): NumberView[] {
  const synced = new Set((tpl.numbers ?? []).map((a) => a.number_id));
  const role = numbers
    .filter((n) => n.purpose === tpl.line)
    .sort(
      (a, b) => Number(b.is_default) - Number(a.is_default) || a.fallback_rank - b.fallback_rank,
    );
  const own = numbers.filter((n) => n.id === tpl.number_id);
  const others = numbers.filter((n) => synced.has(n.id));
  return [...new Map([...own, ...role, ...others].map((n) => [n.id, n])).values()];
}

/**
 * Its synced row's status; with no row, the role's default counts as the registry status (decision 4:
 * the per-line sync checked the role's WABA), any other number is not synced yet.
 */
export function approvalOf(tpl: Tpl, number: NumberView): NumberApprovalState {
  const row = (tpl.numbers ?? []).find((a) => a.number_id === number.id);
  if (row) return row.status;
  return number.is_default && number.purpose === tpl.line ? tpl.status : 'not_synced';
}

export const approvalRows = (tpl: Tpl, numbers: readonly NumberView[]): NumberApprovalRow[] =>
  shownNumbers(tpl, numbers).map((number) => ({ number, state: approvalOf(tpl, number) }));

/** «معتمد جزئيًا»: approved on some shown numbers, not on all of them. */
export const isPartial = (rows: readonly NumberApprovalRow[]): boolean =>
  rows.some((r) => r.state === 'approved') && rows.some((r) => r.state !== 'approved');
