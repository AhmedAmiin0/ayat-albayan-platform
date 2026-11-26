import type { ReactNode } from 'react';
import type { Selection } from '@/finance/pricing/selection';

export interface PricingStepsProps {
  selection: Selection;
  /** Only what the pressed step changed. */
  onChange: (patch: Partial<Selection>) => void;
  /** Off for a price list: it has every duration and package, so their two steps are hidden. */
  planSteps?: boolean;
  /** The caller's own control inside the discount step (the chat sheet's custom amount). */
  discountExtra?: ReactNode;
}
