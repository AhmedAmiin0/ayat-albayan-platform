import { DURATIONS, type PackageSize, type PaymentKind, type PaymentMethod, type PayoutStatus } from '@ab/shared';
import type { Json } from '@ab/db';
import { ar } from '../../common/i18n/server-text';
import { riyadhStamp, safeText, type Cell } from './csv';

// Payments and payouts CSV rows (R-RPT-03, R-TCH-04). Money as numbers, in the row's currency.

const { students: S, payments: P, payouts: Y, subscriptions: SUB, exports: X } = ar;

export interface PaymentIn {
  paid_at: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  note: string | null;
  kind: PaymentKind;
  original_amount: number | null;
  original_currency: string | null;
  subscription: { package: PackageSize | null; lessons_total: number; student: { code: string | null; name: string } | null } | null;
}

export const paymentHeader = (): Cell[] => [P.paidAt, S.code, S.name, SUB.package, SUB.lessonsTotal, ar.finance.kind, P.amount, P.currency, P.method, ar.finance.originalAmount, P.note];

export function paymentRows(rows: readonly PaymentIn[]): Cell[][] {
  return [
    paymentHeader(),
    ...rows.map((p) => {
      const sub = p.subscription;
      return [
        riyadhStamp(p.paid_at),
        sub?.student?.code ?? '',
        safeText(sub?.student?.name),
        sub?.package ? ar.enums.packageSize[sub.package] : '',
        sub?.lessons_total ?? '',
        ar.enums.paymentKind[p.kind],
        // A refund is money back: negative in the file, so a column sum is the net.
        p.kind === 'refund' ? -Number(p.amount) : Number(p.amount),
        p.currency,
        ar.enums.paymentMethod[p.method],
        p.original_amount === null ? '' : `${Number(p.original_amount)} ${p.original_currency ?? ''}`,
        safeText(p.note),
      ];
    }),
  ];
}

export interface PayoutIn {
  month: string;
  lessons_count: number;
  amount: number;
  currency: string;
  status: PayoutStatus;
  paid_at: string | null;
  breakdown: Json;
  teacher: { display_name_ar: string } | null;
}

interface Line {
  /** Minutes: 30/45/60/90 or a pro-rated length (pay-rule.ts). */
  duration: number;
  lessons: number;
  rate: number | null;
  amount: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** breakdown.lines as B3 writes them (PayoutLine[]); anything malformed is skipped, never guessed. */
export function payoutLines(breakdown: Json): Line[] {
  const lines = isRecord(breakdown) ? breakdown['lines'] : null;
  if (!Array.isArray(lines)) return [];
  return lines.flatMap((l) => {
    if (!isRecord(l)) return [];
    const { duration, lessons, rate, amount } = l;
    if (typeof duration !== 'number' || duration <= 0 || typeof lessons !== 'number' || typeof amount !== 'number') return [];
    return [{ duration, lessons, rate: typeof rate === 'number' ? rate : null, amount }];
  });
}

export const payoutHeader = (): Cell[] => [Y.teacher, Y.month, S.status, SUB.duration, Y.lessons, Y.rate, Y.amount, P.currency, P.paidAt];

/** One total row per teacher (by name), then one row per breakdown line. */
export function payoutRows(rows: readonly PayoutIn[]): Cell[][] {
  const sorted = [...rows].sort((a, b) => (a.teacher?.display_name_ar ?? '').localeCompare(b.teacher?.display_name_ar ?? '', 'ar'));
  return [
    payoutHeader(),
    ...sorted.flatMap((p) => {
      const lead: Cell[] = [safeText(p.teacher?.display_name_ar), p.month.slice(0, 7), ar.enums.payoutStatus[p.status]];
      const total: Cell[] = [...lead, X.total, p.lessons_count, '', Number(p.amount), p.currency, riyadhStamp(p.paid_at)];
      const lines = payoutLines(p.breakdown).map((l): Cell[] => [
        ...lead,
        durationText(l.duration),
        l.lessons,
        l.rate,
        l.amount,
        p.currency,
        '',
      ]);
      return [total, ...lines];
    }),
  ];
}

/** «45 دقيقة» from the enum labels; a pro-rated length reads «50 دقيقة». */
function durationText(minutes: number): string {
  const standard = DURATIONS.find((d) => d === minutes);
  return standard === undefined ? ar.earnings.minutes.replace('{count}', String(minutes)) : ar.enums.duration[standard];
}
