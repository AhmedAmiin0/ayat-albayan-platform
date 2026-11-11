import { canEditReport, editUntil, SETTING_DEFAULTS, type LessonStudentView } from '@ab/shared';
import type { Role } from '@/common/auth/verify-token';
import type { LessonRow } from './lesson-row';

type Embedded = LessonRow['lesson_students'][number]['report'];
type ReportState = NonNullable<LessonStudentView['report']>;

/** Who reads the lesson, when, and settings.report_teacher_edit_minutes (docs/46 B7). */
interface ReportWindow {
  role: Role | null;
  now: Date;
  minutes: number;
}

const instant = (iso: string | null | undefined): Date | null => (iso ? new Date(iso) : null);
const SETTING_DEFAULT_MINUTES = SETTING_DEFAULTS.report_teacher_edit_minutes;
const isoOf = (at: Date | null): string | null => (at === null ? null : at.toISOString());

type Instants = { submittedAt: Date | null; sentAt: Date | null };

/**
 * canEditReport for the reader: the teacher until first submit + minutes and never once sent, the
 * admin always.
 */
const mayEdit = (w: ReportWindow, at: Instants): boolean =>
  w.role !== null && canEditReport({ role: w.role, ...at, now: w.now, minutes: w.minutes });

/**
 * A lesson student's report with its edit window (R-REP-02, docs/46 B7): first submit, family
 * send, can_edit and edit_until; null before a report is opened.
 */
export function lessonReport(report: Embedded, w: ReportWindow): ReportState | null {
  if (!report) return null;
  const submittedAt = instant(report.submitted_at);
  const sentAt = instant(report.sent_at);
  return {
    id: report.id,
    status: report.status,
    submitted_at: isoOf(submittedAt),
    sent_at: isoOf(sentAt),
    can_edit: mayEdit(w, { submittedAt, sentAt }),
    edit_until: isoOf(editUntil({ submittedAt, minutes: w.minutes })),
  };
}

interface WindowContext {
  role: Role | null;
  reportMinutes?: number;
  now?: Date;
}

/** The reader's window from the lesson view context: the registry default and now when absent. */
export function readerWindow(ctx: WindowContext): ReportWindow {
  const minutes = ctx.reportMinutes ?? SETTING_DEFAULT_MINUTES;
  return { role: ctx.role, now: ctx.now ?? new Date(), minutes };
}
