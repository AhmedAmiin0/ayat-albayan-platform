import {
  attendanceKind,
  attendanceTotals,
  type ReportSummaryView,
  type SalesAttendanceDay,
  type SalesStudentDetails,
  type SalesStudentSchedule,
  type SalesStudentSubscription,
  type SalesTrialLesson,
} from '@ab/shared';
import { type HistoryBundle, toSalesHistory } from '../../sales';
import type { AttendanceRow, DetailsStudentRow } from './sales-student.queries';

interface DetailsParts {
  student: DetailsStudentRow;
  history: HistoryBundle | null;
  lessons: readonly AttendanceRow[];
  reports: { items: ReportSummaryView[]; total: number };
  schedule: SalesStudentSchedule;
  trial: SalesTrialLesson[];
  /** Hers: only then the subscriptions and the sent reports (owner 2026-10-28). */
  mine: boolean;
}

const NO_REPORTS = { items: [], total: 0 };

const iso = (at: string): string => new Date(at).toISOString();

/** The history's subscriptions without their payments and audit trail, newest first. */
function subscriptionsOf(history: HistoryBundle | null): SalesStudentSubscription[] {
  if (!history) return [];
  return toSalesHistory('', history)
    .subscriptions.map((s) => ({
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
export function toStudentDetails(p: DetailsParts): SalesStudentDetails {
  const subscriptions = p.mine ? subscriptionsOf(p.history) : [];
  const current = subscriptions.find((s) => s.status === 'active') ?? subscriptions[0];
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
    reports: p.mine ? p.reports : NO_REPORTS,
    schedule: p.schedule,
    trial: p.trial,
  };
}
