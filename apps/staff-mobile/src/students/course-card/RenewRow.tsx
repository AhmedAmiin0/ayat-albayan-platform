import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { useStudentBalance } from '@/payments';
import { renewHref } from '@/students/profile/renew';
import type { StudentRef } from '@/students/shared/types';
import { ActionRow } from './ActionRow';

/**
 * «جدّد الاشتراك» in the admin's «إجراءات الدورة» (owner 2026-11-17: ANY time): the subscribe
 * screen prefilled from the last package, the new package starting on the day picked there. Shown
 * once the balance answers, so it always opens prefilled.
 */
export function RenewRow({ student }: { student: StudentRef }) {
  const balance = useStudentBalance(student.id);
  const to = useStudentHref();
  const href = balance.isPending ? null : renewHref(student, balance.data?.current);
  if (!href) return null;
  return (
    <ActionRow
      title={t.students.renew}
      hint={t.courseCard.hints.renew}
      onPress={() => router.push(to(href))}
    />
  );
}
