import { formatPhone } from '@ab/shared';
import { router } from 'expo-router';
import { memo } from 'react';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { leadStatusChip } from '../detail/lead-words';
import type { Lead } from '../../shared/types';
import { leadRowSubtitle } from './lead-row';

/** One lead: initial, name (or the LTR phone), source line with its age at `now`, status chip. Tap → the lead. */
export const LeadRow = memo(function LeadRow({ lead, now }: { lead: Lead; now: number }) {
  const phone = formatPhone(lead.phone_e164);
  return (
    <ListRow
      leading={<Avatar name={lead.name ?? ''} id={lead.phone_e164} decorative />}
      title={lead.name ?? ltr(phone)}
      meta={lead.name ? phone : undefined}
      subtitle={leadRowSubtitle(lead, now)}
      trailing={<StatusChip {...leadStatusChip(lead.status)} size="sm" />}
      onPress={() => router.push(`/inbox/${lead.id}`)}
    />
  );
});
