import { useHolds } from '@/auth';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { useSalesFamily } from '@/sales-subscribe';
import { useSalesStudent } from '../student/student-api';
import { type MoneyAction, pickMoneyAction } from './money-action';

interface MoneyActionOptions {
  studentId: string;
  /** Known on the student file; a pending row reads it from the (cached) student details. */
  phone?: string | null;
  subscriptionId?: string;
}

/**
 * The student's money action in the page's tree, or null. Same gate as the chat's money pills
 * (self.sales_money) and the same family query, so the opened screen is already loaded.
 */
export function useMoneyAction({ studentId, phone, subscriptionId }: MoneyActionOptions): MoneyAction | null {
  const allowed = useHolds('self.sales_money');
  const base = useTreeBase();
  const details = useSalesStudent(allowed && phone === undefined ? studentId : '');
  const guardian = phone ?? details.data?.student?.guardian_phone ?? '';
  const family = useSalesFamily(guardian, allowed);
  const action = allowed ? pickMoneyAction(family.data, { studentId, phone: guardian, ...(subscriptionId ? { subscriptionId } : {}) }) : null;
  return action ? { ...action, href: inTree(base, action.href) } : null;
}
