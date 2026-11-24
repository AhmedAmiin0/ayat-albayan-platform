import { isPackageEnded } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { renewalPricing, type LastPackage } from '@ab/money';

// Renew any time the student has a package, prefilled from the last one (shared with web).

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
