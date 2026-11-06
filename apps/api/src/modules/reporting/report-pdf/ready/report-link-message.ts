import { reportDate, reportReadyDedupKey } from '@/modules/reporting/report-pdf/report-ready';
import type { ReportSource } from '@/modules/reporting/report-pdf/report-pdf.source';

/** The two link templates (migration 20261106000900): the live page's URL button, no document. */
export type ReportLinkKey = 'report_ready_teacher' | 'report_ready_family';

/** One `messages` insert of a link template. Shape of the columns the PDF job writes. */
export interface ReportLinkMessage {
  direction: 'outbound';
  status: 'queued';
  phone_e164: string;
  guardian_id: string | null;
  lesson_id: string;
  template_key: ReportLinkKey;
  /** button: the report's public_id, the {{1}} of https://app.ayatalbayan.com/report/{{1}}. */
  template_params: Partial<Record<'1' | '2' | '3' | '4', string>> & { button: string };
  dedup_key: string;
  scheduled_for: string;
}

export interface LinkInput {
  source: ReportSource;
  feedbackUrl: string;
  now: Date;
}

/** One teacher message per report, whatever its version (an edit re-renders, never re-sends). */
const reportTeacherDedupKey = (reportId: string): string =>
  `report_ready_teacher:${reportId}`;

/**
 * report_ready_family: {{1}} the student, {{2}} the lesson date in the guardian's zone, {{3}} the
 * teacher, {{4}} the feedback link; the button opens the live page. The SAME dedup key as
 * report_ready (report_ready:{id}): the family gets one report message per report, whichever
 * template, and lesson_reports.sent_at is stamped by the sender as today.
 */
export function familyLinkMessage({ source, feedbackUrl, now }: LinkInput): ReportLinkMessage {
  const { report, guardian } = source;
  return {
    direction: 'outbound',
    status: 'queued',
    phone_e164: guardian.phone_e164,
    guardian_id: guardian.id,
    lesson_id: report.lesson_id,
    template_key: 'report_ready_family',
    template_params: {
      '1': source.student.name,
      '2': reportDate(new Date(source.lesson.starts_at), guardian.tz),
      '3': source.teacher.display_name_ar,
      '4': feedbackUrl,
      button: report.public_id,
    },
    dedup_key: reportReadyDedupKey(report.id),
    scheduled_for: now.toISOString(),
  };
}

/**
 * report_ready_teacher to the lesson's teacher: {{1}} the student, {{2}} the lesson date in the
 * teacher's zone; the button opens the live page. null without a phone on file.
 */
export function teacherLinkMessage({ source, now }: LinkInput): ReportLinkMessage | null {
  const { report, teacher } = source;
  if (!teacher.phone_e164) return null;
  return {
    direction: 'outbound',
    status: 'queued',
    phone_e164: teacher.phone_e164,
    guardian_id: null,
    lesson_id: report.lesson_id,
    template_key: 'report_ready_teacher',
    template_params: {
      '1': source.student.name,
      '2': reportDate(new Date(source.lesson.starts_at), teacher.tz),
      button: report.public_id,
    },
    dedup_key: reportTeacherDedupKey(report.id),
    scheduled_for: now.toISOString(),
  };
}
