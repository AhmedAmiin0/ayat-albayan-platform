import type { PortalAmount, PortalPackage, PortalPackageView, PortalPayment } from '@ab/shared';
import type { PaymentKind } from '@ab/catalog';

// The package view (docs/50 §2); the amount due is shown only when something is owed.

export interface PackageSummary {
  /** Lessons taken over every live package; an older API sends only `remaining`. */
  used: number;
  total: number;
  remaining: number;
  renewsOn: string | null;
  /** null = nothing owed or not known: no badge, no line. */
  amountDue: PortalAmount | null;
}

const owed = (due: PortalAmount | null | undefined): PortalAmount | null =>
  due && due.amount > 0 ? due : null;

export function packageSummary(pkg: PortalPackage): PackageSummary {
  const total = pkg.lessons_total;
  return {
    used: pkg.lessons_used ?? Math.max(0, total - pkg.remaining),
    total,
    remaining: pkg.remaining,
    renewsOn: pkg.renews_on,
    amountDue: owed(pkg.amount_due),
  };
}

/** A refund counts against what was paid: its amount is shown as a minus. */
const SIGN: Readonly<Record<PaymentKind, number>> = { payment: 1, refund: -1 };

/** A payment's amount as the history shows it (refunds negative). */
export const signedAmount = (p: PortalPayment): number => SIGN[p.kind] * Math.abs(p.amount);

/** The academy's transfer text, or null when the setting is empty (the screen shows nothing). */
export const paymentInstructions = (view: PortalPackageView): string | null =>
  view.payment_instructions.trim() || null;
