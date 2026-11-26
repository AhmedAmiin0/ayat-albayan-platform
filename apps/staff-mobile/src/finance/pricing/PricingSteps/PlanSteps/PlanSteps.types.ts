import type { PricingStepsProps } from '@/finance/pricing/PricingSteps/PricingSteps.types';

/** The duration and package steps read and change the same selection as the other steps. */
export type PlanStepsProps = Pick<PricingStepsProps, 'selection' | 'onChange'>;
