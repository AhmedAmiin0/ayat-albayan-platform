import { formatAmount, type TeacherEarningView } from '@ab/money';
import type { ClockCycle } from '@ab/time';
import { clockIn } from '@/core/lib/clock';
import { t, ltr } from '@ab/mobile-kit';
import { instantDay } from '@/core/lib/money/format';

/** Teacher money is EGP. */
export const egp = (amount: number): string => `${ltr(formatAmount(amount))} ${t.earnings.currency}`;

/** On the viewer's clock (docs/34). */
export const sessionWhen = (iso: string, cycle: ClockCycle, tz: string): string =>
  `${instantDay(iso, tz)} · ${clockIn(new Date(iso), tz, cycle)}`;

export function sessionDetail(row: Pick<TeacherEarningView, 'minutes' | 'students'>): string {
  const minutes = t.earnings.minutes.replace('{count}', String(row.minutes));
  return [minutes, row.students.join(t.common.listSeparator)].filter(Boolean).join(' · ');
}
