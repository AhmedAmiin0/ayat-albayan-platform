import { dateText, type PayoutView } from '@ab/shared';
import { t, locale } from '@ab/mobile-kit';

// Payout lines (R-TCH-04) in the UI language with Western digits; pure.

const MONTH = { month: 'long', year: 'numeric' } as const;
const DAY = { day: 'numeric', month: 'long' } as const;
/** The UTC calendar (the API's months and paid/approved days are read in UTC, as before). */
const inUtc = (at: Date, fields: typeof MONTH | typeof DAY) => dateText(at, { tz: 'UTC', locale }, fields);
const durations: Record<string, string | undefined> = t.enums.duration;

export function monthLabel(month: string): string {
  return inUtc(new Date(`${month.slice(0, 7)}-01T00:00:00Z`), MONTH);
}

export function payoutSummary(p: PayoutView): string {
  return `${t.payouts.lessons}: ${p.lessons_count} · ${p.amount} ${t.payouts.currency}`;
}

/** A missing rate shows a dash. */
export function breakdownLines(p: PayoutView): string[] {
  return p.breakdown.lines.map((line) => {
    const sum = t.payouts.line
      .replace('{lessons}', String(line.lessons))
      .replace('{rate}', line.rate === null ? '—' : String(line.rate))
      .replace('{amount}', String(line.amount));
    const length = durations[String(line.duration)] ?? t.earnings.minutes.replace('{count}', String(line.duration));
    return `${length}: ${sum}`;
  });
}

/** Nothing for a draft month. */
export function payoutWhen(p: PayoutView): string | null {
  if (p.paid_at) return t.payouts.paidAt.replace('{date}', inUtc(new Date(p.paid_at), DAY));
  if (p.approved_at) return t.payouts.approvedAt.replace('{date}', inUtc(new Date(p.approved_at), DAY));
  return null;
}
