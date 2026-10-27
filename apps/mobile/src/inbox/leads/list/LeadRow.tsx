import { formatPhone } from '@ab/shared';
import { router } from 'expo-router';
import { memo } from 'react';
import { Avatar } from '@/core/ui/primitives/Avatar';
import { ListRow } from '@/core/ui/layout/ListRow';
import { ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { initialOf } from '../../shared/format';
import { leadStatusChip } from '../detail/lead-words';
import type { Lead } from '../../shared/types';
import { leadRowSubtitle } from './lead-row';

/** One lead: initial, name (or the LTR phone), source line, status chip. Tap → the lead. */
export const LeadRow = memo(function LeadRow({ lead }: { lead: Lead }) {
  const phone = formatPhone(lead.phone_e164);
  return (
    <ListRow
      leading={<Avatar letter={initialOf(lead.name)} />}
      title={lead.name ?? ltr(phone)}
      meta={lead.name ? phone : undefined}
      subtitle={leadRowSubtitle(lead)}
      trailing={<StatusChip {...leadStatusChip(lead.status)} size="sm" />}
      onPress={() => router.push(`/inbox/${lead.id}`)}
    />
  );
});
