import { isPackageEnded, renewalPricing, type LastPackage, type StudentStatus } from '@ab/shared';

// «جدّد الاشتراك» on the admin student file (owner 2026-10-15): only once the package ended
// (pending_renewal, expired). It opens the existing «اشتراك جديد» screen in the students tab,
// prefilled from the student's last package (renewalPricing, shared with web: its tier or custom
// count, lesson length, discount and country), titled as a renewal.

export interface RenewHref {
  pathname: '/students/subscribe';
  params: {
    studentId: string;
    renew: '1';
    plan?: string;
    count?: string;
    minutes?: string;
    discount?: string;
    country?: string;
  };
}

/** The form-prefill params of the last package; none without one (the screen's defaults). */
function prefillOf(last: LastPackage | null | undefined): Omit<RenewHref['params'], 'studentId' | 'renew'> {
  if (!last) return {};
  const p = renewalPricing(last);
  return {
    plan: p.pkg,
    ...(p.pkg === 'custom' ? { count: String(p.count) } : {}),
    minutes: String(p.duration),
    discount: String(p.discount),
    ...(p.country ? { country: p.country } : {}),
  };
}

/** The subscribe screen's route for this student; null while the status is not package-ended. */
export function renewHref(
  student: { id: string; status: StudentStatus },
  last: LastPackage | null | undefined,
): RenewHref | null {
  if (!isPackageEnded(student.status)) return null;
  return { pathname: '/students/subscribe', params: { studentId: student.id, renew: '1', ...prefillOf(last) } };
}
