import { DEFAULT_DURATION, PRICING_DURATIONS, type PackageId } from '@ab/money';
import { t } from '@ab/web-kit';

export const DURATION_OPTIONS = PRICING_DURATIONS.map((d) => ({
  value: String(d),
  label: t.pricing.durations[d],
}));
/** The site's frequency order: once a week up to every day. */
const FREQUENCY_ORDER: readonly PackageId[] = [
  'weekly',
  'starter',
  'standard',
  'premium',
  'monthly',
  'bulk',
];
export const PACKAGE_OPTIONS = [
  ...FREQUENCY_ORDER.map((id) => ({ value: id, label: t.pricing.frequencies[id] })),
  { value: 'custom' as const, label: t.pricing.customLabel },
];

export function durationOf(value: string) {
  return PRICING_DURATIONS.find((d) => String(d) === value) ?? DEFAULT_DURATION;
}
