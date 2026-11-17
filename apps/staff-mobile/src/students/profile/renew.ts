import { isPackageEnded, renewalPricing, type LastPackage, type StudentStatus } from '@ab/shared';

// «جدّد الاشتراك» on the admin student file (owner 2026-10-15): once the package ended
// (pending_renewal, expired), and ANY time the student has a package (owner 2026-11-17: the new
// package starts on the day picked on the subscribe screen). It opens the existing «اشتراك
// جديد» screen in the students tab, prefilled from the student's last package (renewalPricing,
// shared with web: its tier or custom count, lesson length, discount and country), titled as a
// renewal.

interface RenewHref {
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

/** The subscribe screen's route for this student; null without a package and not package-ended. */
export function renewHref(
  student: { id: string; status: StudentStatus },
  last: LastPackage | null | undefined,
): RenewHref | null {
  if (!isPackageEnded(student.status) && !last) return null;
  return { pathname: '/students/subscribe', params: { studentId: student.id, renew: '1', ...prefillOf(last) } };
}
