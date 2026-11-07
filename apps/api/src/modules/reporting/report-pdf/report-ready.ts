import type { CrmReportKind } from '@ab/shared';
import { BUCKETS } from '@/common/storage/storage.paths';
import { AR, localDate } from './render/pdf-text';

/** «AB-0183_2026-09-29_تقرير-الحلقة.pdf»: code, the lesson's local date, reports.pdfFileSuffix. */
export function reportFileName(input: { code: string; startsAt: Date; tz: string }): string {
  return `${input.code}_${localDate(input.startsAt, input.tz)}_${AR.reports.pdfFileSuffix}.pdf`;
}

export interface ReportReadyInput {
  reportId: string;
  lessonId: string;
  studentName: string;
  studentCode: string;
  startsAt: Date;
  guardian: { id: string; phone_e164: string; tz: string };
  pdfPath: string;
  /** {{3}}: the teacher's display name. */
  teacherName: string;
  /** {{4}}: the family's «رأيك يهمّنا» link (shortened), else the web origin. */
  feedbackUrl: string;
  /**
   * The lesson's rule is a trial (schedule_rules.package = 'trial'): the CRM's
   * report_trial_session.
   */
  trial?: boolean;
}

/** One `messages` insert. Shape of the columns the PDF job writes. */
export interface ReportReadyMessage {
  direction: 'outbound';
  status: 'queued';
  phone_e164: string;
  guardian_id: string;
  lesson_id: string;
  template_key: 'report_ready';
  template_params: {
    '1': string;
    '2': string;
    '3': string;
    '4': string;
    document: { bucket: string; path: string; filename: string };
    /**
     * The crm driver's report template by the lesson's kind (docs/19); the meta driver never reads
     * it.
     */
    crm: { report: CrmReportKind };
  };
  dedup_key: string;
  scheduled_for: string;
}

/** One message per report, whatever its version: an edit re-renders but is not re-sent. */
export function reportReadyDedupKey(reportId: string): string {
  return `report_ready:${reportId}`;
}

/**
 * «26/10/2026»: the lesson's local date (dd/MM/yyyy) in `tz`, as session_report_pdf's {{2}} shows
 * it.
 */
export const reportDate = (at: Date, tz: string): string => localDate(at, tz).split('-').reverse().join('/');

/**
 * The queued report_ready WhatsApp message (docs/19 «Report flow», R-REP-03): the WABA's approved
 * session_report_pdf (migration 20261105000301), trial lessons included: the PDF as the document
 * header; {{1}} the student, {{2}} the lesson date in the guardian's zone, {{3}} the teacher, {{4}}
 * the
 * family's feedback link. ONE template call, so the PDF never goes twice. The sender signs the
 * document
 * URL (7 days) when it sends and stamps lesson_reports.sent_at.
 */
export function reportReadyMessage(input: ReportReadyInput, now: Date): ReportReadyMessage {
  const { guardian } = input;
  return {
    direction: 'outbound',
    status: 'queued',
    phone_e164: guardian.phone_e164,
    guardian_id: guardian.id,
    lesson_id: input.lessonId,
    template_key: 'report_ready',
    template_params: {
      '1': input.studentName,
      '2': reportDate(input.startsAt, guardian.tz),
      '3': input.teacherName,
      '4': input.feedbackUrl,
      document: {
        bucket: BUCKETS.reports,
        path: input.pdfPath,
        filename: reportFileName({ code: input.studentCode, startsAt: input.startsAt, tz: guardian.tz }),
      },
      crm: { report: input.trial ? 'trial' : 'regular' },
    },
    dedup_key: reportReadyDedupKey(input.reportId),
    scheduled_for: now.toISOString(),
  };
}
