import { PRICING_DURATIONS } from '@ab/money';
import { t, type FilterPill } from '@ab/mobile-kit';
import type { PlanChoice } from '@/finance/pricing/selection';

const p = t.pricing;

export const DURATIONS = PRICING_DURATIONS.map((d) => {
  const value = `${d}` as const;
  return { value, label: p.durations[value] };
});
const BY_FREQUENCY = ['weekly', 'starter', 'standard', 'premium', 'monthly', 'bulk'] as const;
export const PLANS: readonly FilterPill<PlanChoice>[] = [
  ...BY_FREQUENCY.map((id) => ({ value: id, label: p.frequencies[id] })),
  { value: 'custom', label: p.customLabel },
];
