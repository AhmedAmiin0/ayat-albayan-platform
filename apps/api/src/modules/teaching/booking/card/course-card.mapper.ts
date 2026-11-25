import type { CourseCardPackage } from '@ab/shared';
import { owedFor, type StudentBalanceView } from '@ab/money';

/**
 * The card's package: its status, lessons used and left, what was paid of what
 * it is owed for and its projected end, from the student's balance; null when the balance does
 * not list it (or no package).
 */
export function toCardPackage(
  balance: Pick<StudentBalanceView, 'packages'>,
  subscriptionId: string,
): CourseCardPackage | null {
  const sub = balance.packages.find((p) => p.id === subscriptionId);
  if (!sub) return null;
  return {
    status: sub.status,
    lessonsTotal: sub.lessons_total,
    used: sub.balance.lessons_used,
    left: Math.max(0, sub.balance.remaining),
    paid: sub.paid,
    owed: owedFor(sub),
    currency: sub.currency,
    projectedEndAt: sub.balance.projected_end_at,
  };
}
