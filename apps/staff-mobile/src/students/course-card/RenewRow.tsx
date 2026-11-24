import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { useStudentBalance } from '@/payments';
import { renewHref } from '@/students/profile/renew';
import { ActionRow } from './ActionRow';
import type { StudentRef } from '@ab/shared';

/** Renew any time, prefilled from the last package; shown once the balance answers. */
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
