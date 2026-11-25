import type { CourseStopResult } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { fill } from './course-card-text';

// Pure; nobody is messaged, and admins get a bell for a manual refund transfer.

export interface StopDoneWords {
  done: string;
  doneRefund: string;
  doneStatus: string;
  next: string;
  /** Used when there is nothing to transfer. */
  nextTell: string;
  notifiedFamily: string;
  notifiedTeacher: string;
  notifiedAdmins: string;
}

export interface StopDone {
  head: string;
  status: string;
  next: string;
  notified: string[];
}

/** The done block's lines; `money` formats an amount in the package's currency. */
export function stopDoneLines(input: {
  result: Pick<CourseStopResult, 'refund' | 'studentStatus'>;
  words: StopDoneWords;
  format: { money: (amount: number) => string; status: (status: StudentStatus) => string };
}): StopDone {
  const { result, words, format } = input;
  const refund = result.refund;
  const manual = refund?.manual ?? 0;
  const head = refund ? fill(words.doneRefund, 'amount', format.money(refund.amount)) : words.done;
  const next = manual > 0 ? fill(words.next, 'amount', format.money(manual)) : words.nextTell;
  const admins = manual > 0 ? [words.notifiedAdmins] : [];
  return {
    head,
    status: fill(words.doneStatus, 'status', format.status(result.studentStatus)),
    next,
    notified: [words.notifiedFamily, words.notifiedTeacher, ...admins],
  };
}
