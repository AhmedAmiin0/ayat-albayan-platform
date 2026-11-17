import { router } from 'expo-router';
import { t } from '@ab/mobile-kit';
import { useStudentHref } from '@/core/nav/tree-base';
import { useStudentBalance } from '@/payments';
import { ActionRow } from '@/students/course-card/ActionRow';

/**
 * «سجّل دفعة» in the card's package rows (owner 2026-11-17, board CourseXActions): the payment
 * screen of the current package; moved here from «رصيد الحلقات». Shown once a package exists.
 */
export function PayRow({ studentId }: { studentId: string }) {
  const current = useStudentBalance(studentId).data?.current;
  const to = useStudentHref();
  if (!current) return null;
  return (
    <ActionRow
      title={t.courseCard.pay}
      hint={t.courseCard.hints.pay}
      onPress={() => router.push(to(`/students/payment/${studentId}`))}
    />
  );
}
