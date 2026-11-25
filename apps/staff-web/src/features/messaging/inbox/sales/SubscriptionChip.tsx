import type { SubscriptionBadge } from '@ab/shared';
import { StatusChip, t } from '@ab/web-kit';
import { badgeStyle } from './subscription';

export function SubscriptionChip({ badge, size }: { badge: SubscriptionBadge; size?: 'sm' }) {
  return <StatusChip size={size} {...badgeStyle[badge]} label={t.inbox.subscription.badge[badge]} />;
}
