import {
  formatAmount,
  type StatusStyle,
  type TeacherEarningStatus,
  type TeacherEarningView,
  type TeacherPaymentView,
} from '@ab/shared';
import { t } from '@/lib/i18n';
import { instantDay } from '@/payments/format';
import { ltr } from '@/ui/Ltr';

// Earnings lines: amounts in EGP with Western digits (LTR islands), days on the Riyadh calendar.

export const earningStatusStyle: Record<TeacherEarningStatus, StatusStyle> = {
  earned: { tone: 'neutral', glyph: 'hollow' },
  partially_paid: { tone: 'neutral', glyph: 'half' },
  paid: { tone: 'ok', glyph: 'fill' },
};

/** «1500 ج.م». */
export function egp(amount: number): string {
  return `${ltr(formatAmount(amount))} ${t.payouts.currency}`;
}

/** «45 دقيقة · 1 أكتوبر 2026». */
export function sessionTitle(s: Pick<TeacherEarningView, 'minutes' | 'starts_at'>): string {
  return `${t.teacherEarnings.minutes.replace('{n}', String(s.minutes))} · ${instantDay(s.starts_at)}`;
}

/** «المستحق 150 ج.م · اتدفع 50 ج.م · المتبقي 100 ج.م». */
export function sessionMoney(s: Pick<TeacherEarningView, 'amount' | 'paid' | 'outstanding'>): string {
  const e = t.teacherEarnings;
  return [`${e.amount} ${egp(s.amount)}`, `${e.paidCol} ${egp(s.paid)}`, `${e.outstandingCol} ${egp(s.outstanding)}`].join(' · ');
}

/** «1500 ج.م · 4 حلقة». */
export function paymentLine(p: Pick<TeacherPaymentView, 'amount' | 'sessions'>): string {
  return t.teacherEarnings.paymentLine.replace('{amount}', egp(p.amount)).replace('{n}', String(p.sessions));
}
