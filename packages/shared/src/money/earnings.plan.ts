import { DURATIONS, type LessonStatus } from '../enums/index.js';
import type { TeacherBalance, TeacherEarningStatus, TeacherEarningView } from './earnings.js';

// Pure rules of the per-session ledger. The SQL (migrations 177/178) enforces them in the
// database; this file is the executable spec the unit tests pin and e2e/tests/teacher-earnings
// .sql.spec.ts checks the SQL against. Money is compared in whole piasters: no float drift.

export const cents = (v: number): number => Math.round(v * 100);
export const fromCents = (c: number): number => c / 100;

export interface AllocationInput {
  amount: number;
  earnings: readonly { id: string; starts_at: string; outstanding: number }[];
}
export type AllocationResult =
  | { ok: true; items: { earning_id: string; amount: number }[] }
  | { ok: false; error: 'nothing_due' | 'over_payment' };

/**
 * Spreads `amount` over the sessions oldest first (ties by id), each up to its outstanding: the
 * last one touched may be paid in part. More than the total due → `over_payment`, never a credit.
 */
export function allocateOldestFirst(input: AllocationInput): AllocationResult {
  const open = input.earnings
    .filter((e) => cents(e.outstanding) > 0)
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at) || a.id.localeCompare(b.id));
  if (open.length === 0) return { ok: false, error: 'nothing_due' };
  let left = cents(input.amount);
  const items: { earning_id: string; amount: number }[] = [];
  for (const e of open) {
    if (left <= 0) break;
    const take = Math.min(left, cents(e.outstanding));
    items.push({ earning_id: e.id, amount: fromCents(take) });
    left -= take;
  }
  return left > 0 ? { ok: false, error: 'over_payment' } : { ok: true, items };
}

/** The status the ledger stores for an earning of `amount` with `paid` against it. */
export function earningStatus(input: { amount: number; paid: number }): TeacherEarningStatus {
  const paid = cents(input.paid);
  if (paid > 0 && paid >= cents(input.amount)) return 'paid';
  return paid > 0 ? 'partially_paid' : 'earned';
}

export function summarize(earnings: readonly Pick<TeacherEarningView, 'amount' | 'paid' | 'outstanding'>[]): TeacherBalance {
  const sum = (pick: (e: (typeof earnings)[number]) => number) =>
    fromCents(earnings.reduce((n, e) => n + cents(pick(e)), 0));
  return {
    earned: sum((e) => e.amount),
    paid: sum((e) => e.paid),
    outstanding: sum((e) => e.outstanding),
    sessions: earnings.length,
    open_sessions: earnings.filter((e) => cents(e.outstanding) > 0).length,
    currency: 'EGP',
  };
}

export interface EarningSyncInput {
  lesson: { status: LessonStatus; minutes: number; teacherId: string; startsAt: string };
  /** countLate / countNoShow = settings payout_count_late / payout_count_no_show. */
  settings: { countLate: boolean; countNoShow: boolean };
  /** The teacher's current rate for the lesson's minutes; null = none. */
  rate: number | null;
  existing: { status: TeacherEarningStatus; minutes: number; teacherId: string; rate: number; paid: number } | null;
}
export type EarningSyncAction =
  | { kind: 'none' }
  | { kind: 'create'; minutes: number; rate: number }
  | { kind: 'update'; minutes: number; rate: number; amount: number; status: TeacherEarningStatus; rehome: boolean }
  | { kind: 'delete' };

const isPaidStatus = (s: EarningSyncInput['settings'], status: LessonStatus) =>
  status === 'completed' || (status === 'late' && s.countLate) || (status === 'no_show' && s.countNoShow);

/** Mirror of sync_lesson_earning (migration 177): what the ledger does when a lesson changes. */
export function planEarningSync(input: EarningSyncInput): EarningSyncAction {
  const { lesson, existing } = input;
  const minutes = DURATIONS.find((d) => d === lesson.minutes);
  const { rate } = input;
  const earns = isPaidStatus(input.settings, lesson.status) && minutes !== undefined && rate !== null;
  if (!existing) return earns ? { kind: 'create', minutes, rate } : { kind: 'none' };
  if (existing.status === 'paid') return { kind: 'none' }; // frozen
  if (!earns) return cents(existing.paid) === 0 ? { kind: 'delete' } : { kind: 'none' };
  const same = minutes === existing.minutes && lesson.teacherId === existing.teacherId;
  const price = same ? existing.rate : rate;
  const status = earningStatus({ amount: price, paid: existing.paid });
  return { kind: 'update', minutes, rate: price, amount: price, status, rehome: cents(existing.paid) === 0 };
}
