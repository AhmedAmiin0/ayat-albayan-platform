import type { PortalPackage, PortalPackageView, PortalPayment, PortalStudent } from '@ab/shared';
import type { StudentBalanceView } from '@ab/money';
import { toFamilyBalance } from '@/modules/finance/subscriptions';

/**
 * Money and the package belong to a guardian or an adult student who is their own contact
 * (docs/50 §2); a child's own login never reads them (403 package_guardian_only).
 */
export const readsMoney = (
  role: string | null,
  student: Pick<PortalStudent, 'contact_is_self'>,
): boolean => role === 'guardian' || student.contact_is_self;

/** The current package (the newest live one) with the family's reading of the staff balance. */
export function toPortalPackage(view: StudentBalanceView): PortalPackage | null {
  const current = view.current;
  if (!current) return null;
  const family = toFamilyBalance(view);
  return {
    package: current.package,
    duration: current.duration,
    lessons_total: family.lessons_total,
    lessons_used: family.lessons_used,
    remaining: family.remaining,
    starts_on: current.starts_on,
    renews_on: current.renews_on,
    status: current.status,
    amount_due: family.amount_due,
  };
}

interface PackageParts {
  balance: StudentBalanceView;
  payments: PortalPayment[];
  /** settings.family_payment_instructions ('' = none). */
  instructions: string;
}

/** GET …/package: whitelisted fields only (never the price, quote, fx, notes or receipts). */
export function toPortalPackageView(parts: PackageParts): PortalPackageView {
  return {
    package: toPortalPackage(parts.balance),
    payments: parts.payments,
    payment_instructions: parts.instructions.trim(),
  };
}
