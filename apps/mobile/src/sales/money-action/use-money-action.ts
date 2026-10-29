import type { SalesFamilyView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useHolds } from '@/auth';
import { apiFetch } from '@/core/lib/http/api';
import { inTree, useTreeBase } from '@/core/nav/tree-base';
import { useSalesStudent } from '../student/student-api';
import { type MoneyAction, pickMoneyAction } from './money-action';

/**
 * GET /sales/money/family?phone under the chat money pills' own key (sales-subscribe lib/family.ts), so
 * both share one cache and its refresh after a transfer; read here because @/sales-subscribe imports @/sales.
 */
const useFamily = (phone: string, enabled: boolean) =>
  useQuery({
    queryKey: ['sales', 'money', 'family', phone],
    queryFn: () => apiFetch<SalesFamilyView>(`/sales/money/family?phone=${encodeURIComponent(phone)}`),
    enabled: enabled && phone !== '',
  });

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
  const family = useFamily(guardian, allowed);
  const action = allowed ? pickMoneyAction(family.data, { studentId, phone: guardian, ...(subscriptionId ? { subscriptionId } : {}) }) : null;
  return action ? { ...action, href: inTree(base, action.href) } : null;
}
