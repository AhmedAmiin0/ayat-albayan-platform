import type { AssistantCommissionType, CommissionAmount } from '../commission';
import type { StartFact } from '../started';

export interface PaymentFact {
  amount: number;
  kind: 'payment' | 'refund';
  paid_at: string;
  created_at?: string;
  id?: string;
}

/** starts_on / lessons_used_before (StartFact): a course that already started earns nothing. */
export interface SubscriptionFact extends StartFact {
  id: string;
  price: number;
  currency: string;
  created_at: string;
  payments: readonly PaymentFact[];
}

export interface Running {
  net: number;
  crossedAt: string | null;
}

export interface FirstFullyPaid {
  subscription: SubscriptionFact;
  fullAt: string;
}

export interface CommissionTermsInput {
  type: AssistantCommissionType;
  value: number;
  currency: string | null;
  /** YYYY-MM-DD: no retroactive commission. */
  startsOn: string;
}

export interface PlannedCommission extends CommissionAmount {
  subscriptionId: string;
  fullAt: string;
  base: number;
  baseCurrency: string;
}

/**
 * Who brought the student, when, on which terms and zone: what every commission is checked against.
 */
export interface CommissionContext {
  broughtBy: string | null;
  /** When the student was brought (students.brought_at, an instant). */
  broughtAt: string | null;
  terms: CommissionTermsInput | null;
  tz: string;
}
