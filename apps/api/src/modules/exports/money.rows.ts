import { DURATIONS, type Duration, type PackageSize, type PaymentMethod, type PayoutStatus } from '@ab/shared';
import type { Json } from '@ab/db';
import ar from '@ab/shared/i18n/ar.json';
import { riyadhStamp, safeText, type Cell } from './csv';

// Payments and payouts CSV rows (R-RPT-03, R-TCH-04). Money as numbers, in the row's currency.

const { students: S, payments: P, payouts: Y, subscriptions: SUB, exports: X } = ar;

export interface PaymentIn {
  paid_at: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  note: string | null;
  subscription: { package: PackageSize | null; lessons_total: number; student: { code: string | null; name: string } | null } | null;
}

export const PAYMENT_HEADER: Cell[] = [P.paidAt, S.code, S.name, SUB.package, SUB.lessonsTotal, P.amount, P.currency, P.method, P.note];

export function paymentRows(rows: readonly PaymentIn[]): Cell[][] {
  return [
    PAYMENT_HEADER,
    ...rows.map((p) => {
      const sub = p.subscription;
      return [
        riyadhStamp(p.paid_at),
        sub?.student?.code ?? '',
        safeText(sub?.student?.name),
        sub?.package ? ar.enums.packageSize[sub.package] : '',
        sub?.lessons_total ?? '',
        Number(p.amount),
        p.currency,
        ar.enums.paymentMethod[p.method],
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
  duration: Duration;
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
    const duration = DURATIONS.find((d) => d === l['duration']);
    const { lessons, rate, amount } = l;
    if (duration === undefined || typeof lessons !== 'number' || typeof amount !== 'number') return [];
    return [{ duration, lessons, rate: typeof rate === 'number' ? rate : null, amount }];
  });
}

export const PAYOUT_HEADER: Cell[] = [Y.teacher, Y.month, S.status, SUB.duration, Y.lessons, Y.rate, Y.amount, P.currency, P.paidAt];

/** One total row per teacher (by name), then one row per breakdown line. */
export function payoutRows(rows: readonly PayoutIn[]): Cell[][] {
  const sorted = [...rows].sort((a, b) => (a.teacher?.display_name_ar ?? '').localeCompare(b.teacher?.display_name_ar ?? '', 'ar'));
  return [
    PAYOUT_HEADER,
    ...sorted.flatMap((p) => {
      const lead: Cell[] = [safeText(p.teacher?.display_name_ar), p.month.slice(0, 7), ar.enums.payoutStatus[p.status]];
      const total: Cell[] = [...lead, X.total, p.lessons_count, '', Number(p.amount), p.currency, riyadhStamp(p.paid_at)];
      const lines = payoutLines(p.breakdown).map((l): Cell[] => [
        ...lead,
        ar.enums.duration[l.duration],
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
