import { toMessage } from '@/modules/reporting/report-pdf/report-pdf.mapper';
import type { ReportReadyMessage } from '@/modules/reporting/report-pdf/report-ready';
import {
  familyLinkMessage,
  teacherLinkMessage,
  type LinkInput,
  type ReportLinkMessage,
} from './report-link-message';

/** What the PDF job queues for one report. */
export type ReadyMessage = ReportReadyMessage | ReportLinkMessage;

export interface ChoiceInput extends LinkInput {
  pdfPath: string;
  /** The approved keys among report_ready_family / report_ready_teacher (ReportReadyRepo). */
  approved: ReadonlySet<string>;
}

type FamilyWay = 'link' | 'document';

/** The teacher hears of the first version only: an edit's re-render days later says nothing new. */
const teacherDue = (i: ChoiceInput): boolean =>
  i.approved.has('report_ready_teacher') && i.source.report.version === 1;

/** The family's one message: the live page's link once approved, today's PDF document before. */
const FAMILY: Record<FamilyWay, (input: ChoiceInput) => ReadyMessage> = {
  link: familyLinkMessage,
  document: (i) => toMessage(i.source, { pdfPath: i.pdfPath, feedbackUrl: i.feedbackUrl }, i.now),
};

/**
 * The messages after a rendered PDF (owner 2026-11-06): the family gets report_ready_family
 * while it is approved, else report_ready (session_report_pdf, the PDF as a document); the
 * teacher gets report_ready_teacher only while it is approved (and they have a phone), else
 * nothing extra. Each is deduped per report, so an edit's re-render never sends again.
 */
export function readyMessages(input: ChoiceInput): ReadyMessage[] {
  const way: FamilyWay = input.approved.has('report_ready_family') ? 'link' : 'document';
  const teacher = teacherDue(input) ? teacherLinkMessage(input) : null;
  return [FAMILY[way](input), ...(teacher ? [teacher] : [])];
}
