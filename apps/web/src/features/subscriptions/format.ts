import {
  counted,
  formatAmount,
  packageProgress,
  type AdminTaskView,
  type BalanceView,
  type PackageProgress,
  type StudentBalanceView,
} from '@ab/shared';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import type { SubscriptionView } from './api';

// Display text for the money screens. Wording from ar.json, Western digits (docs/07 §2).

const symbols: Readonly<Record<string, string>> = { ...t.pricing.currencies, EGP: t.payouts.currency };

/** The currency's Arabic symbol («ر.س», «ج.م»), else its ISO code. */
export function currencySymbol(iso: string): string {
  return symbols[iso] ?? iso;
}

/** «145 ر.س» as plain text (aria labels, CSV-free places). */
export function moneyText(amount: number, currency: string): string {
  return `${formatAmount(amount)} ${currencySymbol(currency)}`;
}

/** docs/07 §6 package line: «فاضل حلقتين», tone act at the R-SUB-02 threshold. */
export function progressOf(b: Pick<BalanceView, 'lessons_used' | 'lessons_total'>, threshold?: number): PackageProgress {
  const opts = threshold === undefined ? {} : { threshold };
  return packageProgress(b.lessons_used, b.lessons_total, { forms: t.subscriptions.progress, ...opts });
}

/** The student's line across every package (FIFO): remaining = StudentBalanceView.remaining. */
export function studentProgress(view: Pick<StudentBalanceView, 'packages'>): PackageProgress {
  const sum = (pick: (b: BalanceView) => number) => view.packages.reduce((n, p) => n + pick(p.balance), 0);
  return progressOf({ lessons_used: sum((b) => b.lessons_used), lessons_total: sum((b) => b.lessons_total) });
}

const [LRI, PDI] = [String.fromCodePoint(0x2066), String.fromCodePoint(0x2069)];

/** «يوسف أحمد · AB-0210»: names repeat in the academy, the code (an LTR isolate) tells them apart. */
export function studentLabel(s: { name: string; code: string }): string {
  return `${s.name} · ${LRI}${s.code}${PDI}`;
}

/** «4 حلقات في الشهر», or a custom count «10 حلقات». */
export function packageName(s: Pick<SubscriptionView, 'package' | 'lessons_total'>): string {
  return s.package === null ? counted(t.pricing.customSessions, s.lessons_total) : t.enums.packageSize[s.package];
}

/**
 * «باقة سهيلة قربت تخلص». The stored title is the balance when the task was raised; it is kept
 * for the record only, never shown: the live balance is on the package row above.
 */
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
