import { DURATIONS, type Duration } from '../enums/index.js';
import { earningStatus, type EarningStatus } from './earnings.js';

// Executable specification of public.sync_teacher_earning (migration 177): the database trigger
// is the only writer, this twin pins its decisions in unit tests (the cloud run has no database).

export interface SyncLesson {
  status: string;
  minutes: number;
  teacherId: string;
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
}
export type SyncAction =
  | { kind: 'none' }
  | { kind: 'insert'; rate: number; amount: number }
  | { kind: 'update'; rate: number; amount: number; status: EarningStatus }
  | { kind: 'delete' }
  | { kind: 'cap'; amount: number };

function counts(i: SyncInput): boolean {
  const { status } = i.lesson;
  if (status === 'completed') return true;
  return (status === 'late' && i.countLate) || (status === 'no_show' && i.countNoShow);
}

/** The rate the earning carries: frozen while the length and teacher are unchanged, else the teacher's now. */
function rateFor(i: SyncInput): number | null {
  const { earning, lesson } = i;
  if (earning && earning.minutes === lesson.minutes && earning.teacherId === lesson.teacherId) return earning.rate;
  const d = DURATIONS.find((x) => x === lesson.minutes);
  return d === undefined ? null : i.rates[d];
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
