import type { SubscriptionBadge } from '@ab/shared';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { badgeStyle } from './subscription';

/** «مشترك» / «اشتراكه خلص» / «مش مشترك» (docs/07 §6 nuqta chip). */
export function SubscriptionChip({ badge, size }: { badge: SubscriptionBadge; size?: 'sm' }) {
  return <StatusChip size={size} {...badgeStyle[badge]} label={t.inbox.subscription.badge[badge]} />;
}
