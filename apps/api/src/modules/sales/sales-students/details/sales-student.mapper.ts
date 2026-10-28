import {
  attendanceKind,
  attendanceTotals,
  currentPackage,
  netPaid,
  partPaid,
  type SalesPartPaid,
  type ReportSummaryView,
  type SalesAttendanceDay,
  type SalesStudentDetails,
  type SalesStudentSchedule,
  type SalesStudentSubscription,
  type SalesTrialLesson,
} from '@ab/shared';
import { type HistoryBundle, toSalesHistory } from '../../sales';
import type { AttendanceRow, DetailsStudentRow, PriceRow } from './sales-student.queries';

interface DetailsParts {
  student: DetailsStudentRow;
  history: HistoryBundle | null;
  lessons: readonly AttendanceRow[];
  reports: { items: ReportSummaryView[]; total: number };
  schedule: SalesStudentSchedule;
  /** Empty unless the viewer holds self.sales_money (part_paid). */
  prices?: readonly PriceRow[];
  trial: SalesTrialLesson[];
  /** Hers: only then the subscriptions and the sent reports (owner 2026-10-28). */
  mine: boolean;
}


const iso = (at: string): string => new Date(at).toISOString();

/** «مدفوعة جزئيًا» per package (owner 2026-10-28): net paid against the price, only when 0 < paid < price. */
function partPaidOf(history: HistoryBundle, prices: readonly PriceRow[]): Map<string, SalesPartPaid> {
  return new Map(
    prices.flatMap((p) => {
      const paid = netPaid(history.payments.filter((x) => x.subscription_id === p.id).map((x) => ({ amount: Number(x.amount), kind: x.kind })));
      const part = partPaid({ paid, price: Number(p.price) });
      return part ? [[p.id, { ...part, currency: p.currency }] as const] : [];
    }),
  );
}

const partOf = (money: ReadonlyMap<string, SalesPartPaid>, id: string): { part_paid?: SalesPartPaid } => {
  const part = money.get(id);
  return part ? { part_paid: part } : {};
};

/** The history's subscriptions without their payments and audit trail, newest first. */
function subscriptionsOf(history: HistoryBundle | null, prices: readonly PriceRow[]): SalesStudentSubscription[] {
  if (!history) return [];
  const money = partPaidOf(history, prices);
  return toSalesHistory('', history)
    .subscriptions.map((s) => ({
      ...partOf(money, s.id),
      id: s.id,
      package: s.package,
      status: s.status,
      starts_on: s.starts_on,
      renews_on: s.renews_on,
      ended_at: s.ended_at,
      created_at: s.created_at,
      lessons_total: s.lessons_total,
      lessons_used: s.lessons_used,
      lessons_remaining: s.lessons_remaining,
    }))
    .reverse();
}

/** The student's own attendance per lesson, newest first; a moved lesson is left out (its new one counts). */
function attendanceDays(studentId: string, lessons: readonly AttendanceRow[]): SalesAttendanceDay[] {
  return lessons.flatMap((l) => {
    const own = l.lesson_students.find((s) => s.student_id === studentId);
    const kind = attendanceKind(l.status, own?.attendance ?? null);
    return kind ? [{ lesson_id: l.id, starts_at: iso(l.starts_at), kind }] : [];
  });
}

/**
 * Whitelist of «تفاصيل الطالب» (docs/16 row 36): no price, payment, note, phone or meeting link («الجدول»
 * included). Not hers: no subscription and no report, whatever was read.
 */
/** Hers: the subscriptions and the sent reports; not hers: neither, whatever was read. */
const owned = (p: DetailsParts) =>
  p.mine ? { subscriptions: subscriptionsOf(p.history, p.prices ?? []), reports: p.reports } : { subscriptions: [], reports: { items: [], total: 0 } };

export function toStudentDetails(p: DetailsParts): SalesStudentDetails {
  const { subscriptions, reports } = owned(p);
  const current = currentPackage(subscriptions); // never a cancelled one (owner 2026-10-28)
  const items = attendanceDays(p.student.id, p.lessons);
  return {
    mine: p.mine,
    student: {
      id: p.student.id,
      code: p.student.code ?? '',
      name: p.student.name,
      status: p.student.status,
      program: p.student.program,
      teacher_name: p.student.teacher?.display_name_ar ?? null,
      guardian_phone: p.student.guardian?.phone_e164 || null,
    },
    subscriptions,
    current_id: current?.id ?? null,
    attendance: { items, totals: attendanceTotals(items) },
    reports,
    schedule: p.schedule,
    trial: p.trial,
  };
}
