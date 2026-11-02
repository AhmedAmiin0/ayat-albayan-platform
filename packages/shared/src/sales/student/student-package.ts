import type { PackageSize, SubscriptionStatus } from '@ab/catalog';

// The current package of ANY student for the assistant (owner 2026-10-30: «Why i cant see the
// subscription lessons and status of this user»): «كل الطلاب»'s rows and «تفاصيل الطالب».
// Whitelist: never a price, currency, payment, receipt or commission (those stay for her own
// students). Pure.

/** Size, status, dates and lessons used / left (v_subscription_balance, lessons_used_before in). */
export interface SalesPackageSummary {
  id: string;
  package: PackageSize | null;
  status: SubscriptionStatus;
  starts_on: string;
  renews_on: string | null;
  ended_at: string | null;
  /** The start of the booked lesson expected to use the last one left; null when not known. */
  projected_end_at: string | null;
  created_at: string;
  lessons_total: number;
  lessons_used: number;
  lessons_remaining: number;
}

/** The words of one summary line, in the app's language. */
export interface PackageWords {
  size: (size: PackageSize | null) => string;
  status: (status: SubscriptionStatus) => string;
  /** A UTC instant as the viewer's calendar day. */
  day: (iso: string) => string;
  /** A calendar day («2026-10-01») as shown (an LTR island). */
  date: (ymd: string) => string;
  /** «استُخدمت {used} من {total}», «المتبقي: {n}», «البدء: {date}» … */
  used: string;
  remaining: string;
  starts: string;
  ended: string;
  projectedEnd: string;
}

const fill = (text: string, values: Record<string, string>): string =>
  Object.entries(values).reduce((out, [k, v]) => out.replace(`{${k}}`, v), text);

/** The end said: the day it ended, else the expected one, else nothing. */
function endPart(p: SalesPackageSummary, w: PackageWords): string[] {
  if (p.ended_at) return [fill(w.ended, { date: w.day(p.ended_at) })];
  if (p.projected_end_at) return [fill(w.projectedEnd, { date: w.day(p.projected_end_at) })];
  return [];
}

/** «8 حلقات · نشط», «استُخدمت 5 من 8», «المتبقي: 3», «البدء: 2026-10-01», «النهاية المتوقعة: …». */
export function packageSummaryParts(p: SalesPackageSummary, w: PackageWords): string[] {
  return [
    `${w.size(p.package)} · ${w.status(p.status)}`,
    fill(w.used, { used: String(p.lessons_used), total: String(p.lessons_total) }),
    fill(w.remaining, { n: String(p.lessons_remaining) }),
    fill(w.starts, { date: w.date(p.starts_on) }),
    ...endPart(p, w),
  ];
}

/** The row's line: the parts joined, «لا توجد باقة حالية» without one; null in an old cache. */
export function packageSummaryText(
  p: SalesPackageSummary | null | undefined,
  words: PackageWords & { noPackage: string },
): string | null {
  if (p === undefined) return null;
  return p ? packageSummaryParts(p, words).join(' · ') : words.noPackage;
}
