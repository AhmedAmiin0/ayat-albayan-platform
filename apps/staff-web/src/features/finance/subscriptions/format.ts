import { counted } from '@ab/core';
import {
  livePackages,
  packageProgress,
  type AdminTaskView,
  type BalanceView,
  type PackageProgress,
  type StudentBalanceView,
} from '@ab/money';
import { ApiError, t, currencySymbol, moneyText } from '@ab/web-kit';
import type { SubscriptionView } from './api';

// Display text for the money screens. Wording from ar.json, Western digits (docs/07 §2).

export { currencySymbol, moneyText };

/** Package line (docs/07 §6), in the act tone at the R-SUB-02 threshold. */
export function progressOf(b: Pick<BalanceView, 'lessons_used' | 'lessons_total'>, threshold?: number): PackageProgress {
  const opts = threshold === undefined ? {} : { threshold };
  return packageProgress(b.lessons_used, b.lessons_total, { forms: t.subscriptions.progress, ...opts });
}

/** The student's line across every live package (FIFO; a cancelled one never counts): remaining = StudentBalanceView.remaining. */
export function studentProgress(view: Pick<StudentBalanceView, 'packages'>): PackageProgress {
  const sum = (pick: (b: BalanceView) => number) => livePackages(view.packages).reduce((n, p) => n + pick(p.balance), 0);
  return progressOf({ lessons_used: sum((b) => b.lessons_used), lessons_total: sum((b) => b.lessons_total) });
}

const [LRI, PDI] = [String.fromCodePoint(0x2066), String.fromCodePoint(0x2069)];

/** Names repeat in the academy, so the LTR code tells them apart. */
export function studentLabel(s: { name: string; code: string }): string {
  return `${s.name} · ${LRI}${s.code}${PDI}`;
}

export function packageName(s: Pick<SubscriptionView, 'package' | 'lessons_total'>): string {
  return s.package === null ? counted(t.pricing.customSessions, s.lessons_total) : t.enums.packageSize[s.package];
}

/** The stored title is the balance at raise time, kept for the record only; never shown. */
export function taskText(task: AdminTaskView): string {
  return t.dashboard.task[task.kind]
    .replace('{student}', task.student?.name ?? '')
    .replace('{left}', '')
    .replace(/:\s*$/, '');
}

/** The R-SUB-02 flag: the newest package is unpaid and nothing is left. */
export function unpaidFlagged(current: SubscriptionView | null, remaining: number): boolean {
  return current?.status === 'unpaid' && remaining <= 0;
}

type ErrorTable = Readonly<Record<string, string>>;

/**
 * An API failure as Arabic: the domain `code`, else the first zod issue (paid_at_future,
 * receipt_type…), looked up in the feature's `error` table; anything else is the generic line.
 */
export function apiErrorText(e: unknown, table: ErrorTable): string {
  if (!(e instanceof ApiError) || typeof e.body !== 'object' || e.body === null) return t.common.error;
  const body = e.body as { code?: unknown; issues?: { message?: unknown }[]; currency?: unknown };
  const key = typeof body.code === 'string' ? body.code : body.issues?.[0]?.message;
  const text = typeof key === 'string' ? table[key] : undefined;
  if (!text) return t.common.error;
  return typeof body.currency === 'string' ? text.replace('{currency}', body.currency) : text;
}
