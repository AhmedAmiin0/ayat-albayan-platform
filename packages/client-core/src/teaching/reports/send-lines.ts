import { counted, type PluralForm } from '@ab/shared';
import { minutesLeft, reportSendState, type SendReport, type SendState } from './send-state.js';

/** The texts the lines are made of (reports.editUntil, reports.familySend.*, the minute forms). */
export interface SendWords {
  editUntil: string;
  editClosed: string;
  sendsIn: string;
  sending: string;
  sent: string;
  minutes: Readonly<Record<PluralForm, string>>;
}

export interface SendLines {
  /** «يمكنك تعديل التقرير حتى …», «انتهت مدة التعديل…», or nothing (an admin past the window). */
  edit: string | null;
  /** «سيُرسل إلى الأسرة بعد 12 دقيقة», «… يُرسل الآن», «أُرسل إلى الأسرة», or nothing. */
  family: string | null;
}

type LineReport = SendReport & { can_edit?: boolean };
interface LineContext {
  now: Date;
  when: (d: Date) => string;
  words: SendWords;
}

const FAMILY: Record<SendState, (r: LineReport, c: LineContext) => string | null> = {
  window: (r, c) => c.words.sendsIn.replace('{when}', counted(c.words.minutes, minutesLeft(r.edit_until, c.now))),
  sending: (_r, c) => c.words.sending,
  sent: (_r, c) => c.words.sent,
  none: () => null,
};

/**
 * The lines under a submitted report (docs/46 B5), for web and mobile alike: how long the teacher
 * may still edit it, and where it stands with the family. Drafts get neither.
 */
export function sendLines(report: LineReport, c: LineContext): SendLines {
  const state = reportSendState(report, c.now);
  const open = state === 'window' && report.edit_until;
  const until = open ? c.words.editUntil.replace('{when}', c.when(new Date(open))) : null;
  const closed = report.status === 'submitted' ? c.words.editClosed : null;
  return { edit: report.can_edit ? until : closed, family: FAMILY[state](report, c) };
}

/**
 * Still editable now (the sent list's chip, docs/46 B5): the API's can_edit as of the fetch, AND
 * the window not yet passed on this clock, so a list left open does not offer a closed edit.
 */
export const editableNow = (report: LineReport, now: Date): boolean =>
  report.can_edit === true && reportSendState(report, now) === 'window';
