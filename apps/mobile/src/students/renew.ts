import { isPackageEnded, type StudentStatus, type SubscriptionView } from '@ab/shared';

// «جدّد الاشتراك» on the admin student file (owner 2026-10-15): only once the package ended
// (pending_renewal, expired). It opens the existing «اشتراك جديد» screen in the students tab,
// prefilled from the student's last package (its size and lesson length), titled as a renewal.

export interface RenewHref {
  pathname: '/students/subscribe';
  params: { studentId: string; renew: '1'; pkg?: string; minutes?: string };
}

/** The subscribe screen's route for this student; null while the status is not package-ended. */
export function renewHref(
  student: { id: string; status: StudentStatus },
  last: Pick<SubscriptionView, 'package' | 'duration'> | null | undefined,
): RenewHref | null {
  if (!isPackageEnded(student.status)) return null;
  const prefill = {
    ...(last?.package ? { pkg: last.package } : {}),
    ...(last ? { minutes: String(last.duration) } : {}),
  };
  return { pathname: '/students/subscribe', params: { studentId: student.id, renew: '1', ...prefill } };
}
