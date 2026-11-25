import type { SubscriptionBadge } from '@ab/shared';
import { StatusChip } from '@ab/web-kit/components/ui/display/status-chip';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { badgeStyle } from './subscription';

export function SubscriptionChip({ badge, size }: { badge: SubscriptionBadge; size?: 'sm' }) {
  return (
    <StatusChip size={size} {...badgeStyle[badge]} label={t.inbox.subscription.badge[badge]} />
  );
}
