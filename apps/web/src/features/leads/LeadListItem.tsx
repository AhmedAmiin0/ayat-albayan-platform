import { leadStatusStyle } from '@ab/shared';
import { useRef } from 'react';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Ltr } from '@/components/ui/ltr';
import { StatusChip } from '@/components/ui/status-chip';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { formatAge, formatDateTime, initialOf } from './format';
import { ReclassifyConfirm } from './ReclassifyConfirm';
import type { LeadRow } from './types';

/** Shared with the list head so chips line up across rows (docs/07 §9). */
export const leadGridClass = 'sm:grid-cols-[38px_minmax(0,1fr)_156px_56px]';

export interface LeadListItemProps {
  lead: LeadRow;
  /** The inline reclassify confirm is open on this row. */
  confirming: boolean;
  busy: boolean;
  onAsk: () => void;
  onKeep: () => void;
  onMove: () => void;
}

/**
 * One inbox row: avatar initial · name, E.164 phone, source, lead age · status chip · actions.
 * TODO(R-LEAD-02): unread dot, last-message line and the per-status next-action button (رد /
 * اقترح ميعاد / فتح الحلقة) arrive with Phase 4 messaging; تحويل لطالب with R-LEAD-06.
 */
export function LeadListItem({ lead, confirming, busy, onAsk, onKeep, onMove }: LeadListItemProps) {
  const ask = useRef<HTMLButtonElement>(null);
  const who = lead.name ?? lead.phone_e164;

  return (
    <li
      className={cn(
        'grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-rule px-2.5 py-3 transition-colors duration-[120ms]',
        leadGridClass,
        confirming ? 'bg-gold-wash/50' : 'hover:bg-sunk/75',
      )}
    >
      <span
        aria-hidden="true"
        className="row-span-2 grid size-[38px] place-items-center rounded-full bg-gold-wash font-display text-lg font-bold text-ink shadow-[inset_0_0_0_1px_var(--gold)] sm:row-span-1"
      >
        {initialOf(lead.name)}
      </span>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="font-semibold">{lead.name ?? <Ltr>{lead.phone_e164}</Ltr>}</span>
        {lead.name && <Ltr className="text-2xs text-ink-3">{lead.phone_e164}</Ltr>}
        <span className="text-2xs text-ink-3">{t.enums.leadSource[lead.source]}</span>
        <time
          dateTime={lead.created_at}
          title={formatDateTime(lead.created_at)}
          className="ms-auto whitespace-nowrap text-2xs text-ink-3 tabular-nums"
        >
          {formatAge(lead.created_at)}
        </time>
      </div>
      <div className="col-start-2 row-start-2 sm:col-start-3 sm:row-start-1">
        <StatusChip {...leadStatusStyle[lead.status]} label={t.enums.leadStatus[lead.status]} />
      </div>
      <div className="col-start-3 row-start-1 flex justify-end sm:col-start-4">
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
