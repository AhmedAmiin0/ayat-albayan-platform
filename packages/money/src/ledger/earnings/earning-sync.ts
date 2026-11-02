import type { Duration } from '@ab/catalog';
import { earningStatus, type EarningStatus } from './earnings.js';
import { lessonCountsForPay, teacherRateFor } from './pay-rule.js';

// Executable specification of public.sync_teacher_earning (migrations 177, 20261005000200): the database trigger
// is the only writer, this twin pins its decisions in unit tests (the cloud run has no database).

export interface SyncLesson {
  status: string;
  minutes: number;
  teacherId: string;
  /** The rule's package is 'trial'. */
  isTrial?: boolean;
}
export interface SyncEarning {
  teacherId: string;
  minutes: number;
  rate: number;
  amount: number;
  paid_amount: number;
  status: EarningStatus;
}
export interface SyncInput {
  lesson: SyncLesson;
  earning: SyncEarning | null;
  rates: Record<Duration, number | null>;
  countLate: boolean;
  countNoShow: boolean;
  countTrials?: boolean;
}
export type SyncAction =
  | { kind: 'none' }
  | { kind: 'insert'; rate: number; amount: number }
  | { kind: 'update'; rate: number; amount: number; status: EarningStatus }
  | { kind: 'delete' }
  | { kind: 'cap'; amount: number };

function counts(i: SyncInput): boolean {
  const settings = { countLate: i.countLate, countNoShow: i.countNoShow, countTrials: i.countTrials ?? false };
  return lessonCountsForPay({ status: i.lesson.status, isTrial: i.lesson.isTrial ?? false }, settings);
}

/** The rate the earning carries: frozen while the length and teacher are unchanged, else the teacher's now. */
function rateFor(i: SyncInput): number | null {
  const { earning, lesson } = i;
  if (earning && earning.minutes === lesson.minutes && earning.teacherId === lesson.teacherId) return earning.rate;
  return teacherRateFor(lesson.minutes, i.rates);
}

export function planEarningSync(i: SyncInput): SyncAction {
  const rate = counts(i) ? rateFor(i) : null;
  const { earning } = i;
  if (rate !== null) {
    if (!earning) return { kind: 'insert', rate, amount: rate };
    if (earning.status === 'paid') return { kind: 'none' };
    const status = earningStatus({ amount: rate, paid_amount: earning.paid_amount });
    return { kind: 'update', rate, amount: rate, status };
  }
  if (!earning) return { kind: 'none' };
  if (earning.paid_amount === 0) return { kind: 'delete' };
  return earning.status === 'paid' ? { kind: 'none' } : { kind: 'cap', amount: earning.paid_amount };
}
