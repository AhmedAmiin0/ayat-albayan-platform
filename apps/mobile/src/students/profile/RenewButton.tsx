import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { useStudentHref } from '@/core/nav/tree-base';
import { useStudentBalance } from '@/payments/hooks/queries';
import { Button } from '@/core/ui/primitives/Button';
import { renewHref } from './renew';
import type { StudentRef } from '../shared/types';

/**
 * «جدّد الاشتراك» (owner 2026-10-15): on a pending_renewal or expired student only, the subscribe
 * screen prefilled from the last package (GET /students/:id/balance `current`; without it the
 * screen's defaults). Off until the balance answers, like web, so it always opens prefilled. Nothing for
 * any other status. Secondary: the guardian card holds the one filled button.
 */
export function RenewButton({ student }: { student: StudentRef }) {
  const balance = useStudentBalance(student.id);
  const to = useStudentHref();
  const href = renewHref(student, balance.data?.current);
  if (!href) return null;
  return <Button variant="secondary" label={t.students.renew} disabled={balance.isPending} onPress={() => router.push(to(href))} />;
}
