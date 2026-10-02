import type { PackageSize } from '../enums/index.js';
import type { PackageId } from '../pricing/catalog.js';

/**
 * Calculator package (docs/08 §2) → subscriptions.package. A custom lesson count has no size
 * (package null, lessons_total = the count). Weekly is 4 lessons of 90 minutes.
 */
export const TIER_PACKAGE_SIZE: Record<PackageId, PackageSize> = {
  starter: '8',
  standard: '12',
  premium: '16',
  bulk: '28',
  weekly: '4',
  monthly: '20',
};

/**
 * Lessons a week a monthly package implies (a month = 4 weeks): «8 حلقات في الشهر» = twice a
 * week. The booking review warns when the picked weekdays don't match. null for a trial.
 */
export function packagePerWeek(size: PackageSize): number | null {
  return size === 'trial' ? null : Number(size) / 4;
}
