import type {
  PaymentLinkView,
  SalesFamilyStudent,
  SalesMoneySubscriptionView,
} from '@ab/shared';

export type PayMethod = 'bank' | 'online';

export interface SalesSubscribeStepProps {
  students: SalesFamilyStudent[];
  /**
   * The chat's phone: sent only for a child not hers (chatBinding, sales.renew_any,
   * docs/16 row 38).
   */
  phone?: string | undefined;
  /** The student already picked (a renewal); else the only one, or none. */
  picked?: string | undefined;
  /** A renewal: only her students due for one, the calculator prefilled from the picked one's. */
  renew?: boolean | undefined;
  onClose: () => void;
  onSaved: (sub: SalesMoneySubscriptionView) => void;
  /** An online payment: the link made (its unpaid package with it), to send in the chat. */
  onLinked: (link: PaymentLinkView) => void;
}

export interface StudentPickInput {
  students: SalesFamilyStudent[];
  picked?: string | undefined;
  renew: boolean;
}
