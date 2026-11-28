import {
  planOn,
  type CommissionContext,
  type PlannedCommission,
  type SubscriptionFact,
} from './first-paid';
import { commissionKindOf, RENEWAL_CUTOFF } from './kind';

// Renewal commission (migration 20261027000751 assistant_commission_plan): «half of the value» =
// HALF OF HER NORMAL COMMISSION on each renewal (settings.renewal_commission_percent, default 50),
// not half of the renewal's price. Pure twin; the database decides.

/** Renewal share for new renewals: the percent while renewal commission is on, else 0. */
export const renewalShareNow = (s: {
  renewal_commission_enabled: boolean;
  renewal_commission_percent: number;
}): number => (s.renewal_commission_enabled ? s.renewal_commission_percent : 0);

export interface PlannedRenewal extends PlannedCommission {
  /** The share copied onto the row when earned: a later setting change never touches it. */
  share: number;
}

/** A renewal earns only when fully paid after RENEWAL_CUTOFF; each subscription row is its own. */
export function planRenewalCommission(
  input: CommissionContext & {
    share: number;
    subscriptionId: string;
    subscriptions: readonly SubscriptionFact[];
    excluded?: boolean;
  },
): PlannedRenewal | null {
  const sub = input.subscriptions.find((s) => s.id === input.subscriptionId);
  if (!sub || input.excluded || commissionKindOf(input.subscriptions, sub.id) !== 'renewal')
    return null;
  const planned = planOn(input, sub, input.share);
  if (!planned || Date.parse(planned.fullAt) < Date.parse(RENEWAL_CUTOFF)) return null;
  return { ...planned, share: input.share };
}
