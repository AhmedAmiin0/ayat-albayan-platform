import { toMessage } from '@/modules/reporting/report-pdf/report-pdf.mapper';
import type { ReportReadyMessage } from '@/modules/reporting/report-pdf/report-ready';
import { SEND_GRACE_MS } from './render-cutoff';
import {
  familyLinkMessage,
  teacherLinkMessage,
  type LinkInput,
  type ReportLinkMessage,
} from './report-link-message';

/** What the PDF job queues for one report. */
export type ReadyMessage = ReportReadyMessage | ReportLinkMessage;

interface ChoiceInput extends LinkInput {
  pdfPath: string;
  /** The approved keys among report_ready_family / report_ready_teacher (ReportReadyRepo). */
  approved: ReadonlySet<string>;
  /** settings.report_teacher_edit_minutes: when the first close-time render is due. */
  minutes: number;
}

type FamilyWay = 'link' | 'document';

const MINUTE = 60_000;
/**
 * How late after the window's close (+ grace) the first render may still come and tell the
 * teacher: job polls, a retry or a busy queue. Later, it is an admin's re-render of an old report.
 */
export const TEACHER_DUE_SLACK_MS = 60 * MINUTE;

/** This render is the first one after the window closed (not an old report re-rendered). */
const closeRender = (i: ChoiceInput): boolean => {
  const at = i.source.report.submitted_at;
  const due = at === null ? Number.NaN : Date.parse(at) + i.minutes * MINUTE + SEND_GRACE_MS;
  return i.now.getTime() <= due + TEACHER_DUE_SLACK_MS;
};

/**
 * The teacher hears once, with the family's send (docs/46 B4): the render at the window's close,
 * whatever version the in-window edits reached; an admin's re-render after the send, or of an old
 * never-sent report (review 11-11), says nothing.
 */
const teacherDue = (i: ChoiceInput): boolean =>
  i.approved.has('report_ready_teacher') && i.source.report.sent_at === null && closeRender(i);

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
