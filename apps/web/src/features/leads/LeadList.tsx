import { EmptyState } from '@/components/ui/display/empty-state';
import { t } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { leadGridClass, LeadListItem } from './LeadListItem';
import type { LeadRow } from './types';

export interface LeadListProps {
  leads: LeadRow[];
  /** Row whose reclassify confirm is open (one at a time: one primary button per screen). */
  confirmId: string | null;
  busy: boolean;
  onConfirm: (id: string | null) => void;
  onMove: (id: string) => void;
}

/** Inbox rows under a head on a 3px double gold rule (docs/07 §9). */
export function LeadList({ leads, confirmId, busy, onConfirm, onMove }: LeadListProps) {
  if (leads.length === 0) return <EmptyState title={t.leads.empty} />;
  return (
    <div className="min-w-0">
      <div
        aria-hidden="true"
        className={cn(
          'sticky top-0 z-[1] hidden gap-x-3 border-b border-rule bg-page px-2.5 pt-2 pb-2 text-2xs font-semibold text-ink-3 sm:grid',
          leadGridClass,
        )}
      >
        <span className="col-span-2">{t.leads.name}</span>
        <span>{t.leads.status}</span>
        <span>{t.sales.assign.label}</span>
        <span className="justify-self-end">{t.common.actions}</span>
      </div>
      <ul>
        {leads.map((lead) => (
          <LeadListItem
            key={lead.id}
            lead={lead}
            confirming={confirmId === lead.id}
            busy={busy}
            onAsk={() => onConfirm(lead.id)}
            onKeep={() => onConfirm(null)}
            onMove={() => onMove(lead.id)}
          />
        ))}
      </ul>
    </div>
  );
}
