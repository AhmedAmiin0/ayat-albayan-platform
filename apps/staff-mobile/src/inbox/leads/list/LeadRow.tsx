import { formatPhone } from '@ab/core';
import { router } from 'expo-router';
import { memo } from 'react';
import { Avatar, ListRow, ltr, StatusChip } from '@ab/mobile-kit';
import { leadStatusChip } from '@/inbox/leads/detail/lead-words';
import { leadRowSubtitle } from './lead-row';
import type { LeadView } from '@ab/shared';

/** One lead: initial, name (or the LTR phone), source line with its age at `now`, status chip. Tap → the lead. */
export const LeadRow = memo(function LeadRow({ lead, now }: { lead: LeadView; now: number }) {
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
