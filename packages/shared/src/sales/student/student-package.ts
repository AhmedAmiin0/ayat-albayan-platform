import type { PackageSize, SubscriptionStatus } from '@ab/catalog';
import type { SalesPackageSummary } from './student-views.schemas';

// Any student's current package for the assistant; never price, payment or commission.

/** The words of one summary line, in the app's language. */
export interface PackageWords {
  size: (size: PackageSize | null) => string;
  status: (status: SubscriptionStatus) => string;
  /** A UTC instant as the viewer's calendar day. */
  day: (iso: string) => string;
  /** A calendar day («2026-10-01») as shown (an LTR island). */
  date: (ymd: string) => string;
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

export function packageSummaryParts(p: SalesPackageSummary, w: PackageWords): string[] {
  return [
    `${w.size(p.package)} · ${w.status(p.status)}`,
    fill(w.used, { used: String(p.lessons_used), total: String(p.lessons_total) }),
    fill(w.remaining, { n: String(p.lessons_remaining) }),
    fill(w.starts, { date: w.date(p.starts_on) }),
    ...endPart(p, w),
  ];
}

/** The parts joined, or no current package; null in an old cache. */
export function packageSummaryText(
  p: SalesPackageSummary | null | undefined,
  words: PackageWords & { noPackage: string },
): string | null {
  if (p === undefined) return null;
  return p ? packageSummaryParts(p, words).join(' · ') : words.noPackage;
}
