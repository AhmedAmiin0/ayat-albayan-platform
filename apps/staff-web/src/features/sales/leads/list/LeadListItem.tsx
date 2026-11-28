import { formatPhone } from '@ab/core';
import { leadStatusStyle } from '@ab/money';
import { Link } from '@tanstack/react-router';
import { useRef } from 'react';
import {
  Avatar,
  Icon,
  IconButton,
  iconButtonClass,
  Ltr,
  StatusChip,
  t,
  cn,
  useClock,
} from '@ab/web-kit';
import { formatAge, formatDateTime } from '@/features/sales/leads/format';
import { LeadAssignSelect } from './LeadAssignSelect';
import { ReclassifyConfirm } from './ReclassifyConfirm';
import type { LeadListItem as LeadItem } from '@ab/shared';

/** Shared with the list head so chips line up across rows (docs/07 §9). */
export const leadGridClass = 'sm:grid-cols-[36px_minmax(0,1fr)_156px_168px_120px]';

export interface LeadListItemProps {
  lead: LeadItem;
  /** The inline reclassify confirm is open on this row. */
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onKeep: () => void;
  onMove: () => void;
}

export function LeadListItem({ lead, confirming, busy, onAsk, onKeep, onMove }: LeadListItemProps) {
  const clock = useClock();
  const ask = useRef<HTMLButtonElement>(null);
  const who = lead.name ?? lead.phone_e164;

  return (
    <li
      className={cn(
        'grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-rule px-2.5 py-3 transition-colors duration-[120ms]',
        leadGridClass,
        confirming ? 'bg-gold-wash/50' : 'hover:bg-sunk/75',
      )}
    >
      <Avatar name={lead.name ?? ''} id={lead.phone_e164} size="md" decorative className="row-span-2 sm:row-span-1" />
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="font-semibold">{lead.name ?? <Ltr>{formatPhone(lead.phone_e164)}</Ltr>}</span>
        {lead.name && <Ltr className="text-2xs text-ink-3">{formatPhone(lead.phone_e164)}</Ltr>}
        <span className="text-2xs text-ink-3">{t.enums.leadSource[lead.source]}</span>
        <time
          dateTime={lead.created_at}
          title={formatDateTime(lead.created_at, clock)}
          className="ms-auto whitespace-nowrap text-2xs text-ink-3 tabular-nums"
        >
          {formatAge(lead.created_at)}
        </time>
      </div>
      <div className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1">
        <StatusChip {...leadStatusStyle[lead.status]} label={t.enums.leadStatus[lead.status]} />
      </div>
      <div className="col-start-2 row-start-3 sm:col-start-4 sm:row-start-1">
        <LeadAssignSelect lead={lead} />
      </div>
      <div className="col-start-3 row-start-1 flex justify-end gap-1 sm:col-start-5">
        <Link
          to="/admin/inbox"
          search={{ phone: lead.phone_e164, page: 1 }}
          aria-label={t.inbox.openThread.replace('{name}', who)}
          title={t.leads.reply}
          className={iconButtonClass}
        >
          <Icon name="chat" />
        </Link>
        {lead.status !== 'converted' && lead.status !== 'lost' && (
          <Link
            to="/admin/book"
            search={{ leadId: lead.id, phone: lead.phone_e164, name: lead.name ?? undefined }}
            aria-label={t.booking.trialFor.replace('{name}', who)}
            title={t.booking.trialTitle}
            className={iconButtonClass}
          >
            <Icon name="calendar" />
          </Link>
        )}
        <IconButton
          ref={ask}
          label={t.leads.reclassifyRow.replace('{name}', who)}
          aria-expanded={confirming}
          onClick={onAsk}
        >
          <Icon name="brief" />
        </IconButton>
      </div>
      {confirming && (
        <ReclassifyConfirm
          busy={busy}
          onMove={onMove}
          onKeep={() => {
            onKeep();
            ask.current?.focus();
          }}
        />
      )}
    </li>
  );
}
