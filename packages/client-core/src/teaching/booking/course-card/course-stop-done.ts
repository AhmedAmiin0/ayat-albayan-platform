import type { CourseStopResult } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { fill } from './course-card-text.js';

// What «إلغاء الاشتراك» did (owner 2026-11-17, boards CourseXStopDone and CourseXWebDone): the
// head (with the refund), the student's status now, «الخطوة التالية» on its own, and who was
// told (nobody by message; the admins get a bell for a manual transfer). Pure.

export interface StopDoneWords {
  /** «أُلغي الاشتراك وأُوقفت الدورة». */
  done: string;
  /** «أُلغي الاشتراك وسُجّل استرداد {amount}». */
  doneRefund: string;
  /** «حالة الطالب الآن: {status}». */
  doneStatus: string;
  /** «حوّل {amount} للأسرة يدويًا، وأبلغ الأسرة والمعلم/ة في المحادثة.» */
  next: string;
  /** «أبلغ الأسرة والمعلم/ة في المحادثة.» (nothing to transfer). */
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
