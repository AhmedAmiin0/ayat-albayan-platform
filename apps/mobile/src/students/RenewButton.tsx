import { router } from 'expo-router';
import { t } from '@/lib/i18n';
import { useStudentBalance } from '@/payments/queries';
import { Button } from '@/ui/Button';
import { renewHref } from './renew';
import type { StudentRef } from './types';

/**
 * «جدّد الاشتراك» (owner 2026-10-15): on a pending_renewal or expired student only, the subscribe
 * screen prefilled from the last package (GET /students/:id/balance `current`; without it the
 * screen's defaults). Nothing for any other status. Secondary: the guardian card holds the one filled button.
 */
export function RenewButton({ student }: { student: StudentRef }) {
  const last = useStudentBalance(student.id).data?.current;
  const href = renewHref(student, last);
  if (!href) return null;
  return <Button variant="secondary" label={t.students.renew} onPress={() => router.push(href)} />;
}
