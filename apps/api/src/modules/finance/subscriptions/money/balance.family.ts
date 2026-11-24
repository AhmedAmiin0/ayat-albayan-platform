import { toCents } from '@ab/core';
import {
  countsForMoney,
  dueOf,
  livePackages,
  type BalanceView,
  type FamilyBalanceView,
  type StudentBalanceView,
} from '@ab/money';

/**
 * What a family may read of a student's packages (docs/50 §5): the BalanceCard lesson counts over
 * every live package (as the chat's student card, thread-people.mapper subscriptionOf) and what is
 * still owed, a reduction of the staff view, never a second calculation. The amount due sums dueOf
 * of every package that still counts for money (countsForMoney: a stopped course stays owed) in the
 * current package's currency. Never the price, quote, fx, invoices, notes or anyone's pay.
 */
export function toFamilyBalance(view: StudentBalanceView): FamilyBalanceView {
  const live = livePackages(view.packages);
  const sum = (pick: (b: BalanceView) => number) => live.reduce((n, p) => n + pick(p.balance), 0);
  return {
    student_id: view.student_id,
    // Lessons taken past every package (a negative balance) read as none left.
    remaining: Math.max(0, view.remaining),
    lessons_total: sum((b) => b.lessons_total),
    lessons_used: sum((b) => b.lessons_used),
    amount_due: amountDue(view),
  };
}

function amountDue({ current, packages }: StudentBalanceView): FamilyBalanceView['amount_due'] {
  if (!current) return null;
  const owed = packages.filter((p) => countsForMoney(p) && p.currency === current.currency);
  const cents = owed.reduce((n, p) => n + toCents(dueOf(p, p.paid)), 0);
  return { amount: cents / 100, currency: current.currency };
}
