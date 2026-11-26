import type { ReactNode } from 'react';
import type { Selection } from '@/features/finance/pricing/api';

export interface CalcStepsProps {
  sel: Selection;
  onChange: (patch: Partial<Selection>) => void;
  /** The chat's price list has every duration and package, so neither step is asked. */
  allPackages?: boolean;
  /** Beside the discount's free field. */
  discountExtra?: ReactNode;
}
