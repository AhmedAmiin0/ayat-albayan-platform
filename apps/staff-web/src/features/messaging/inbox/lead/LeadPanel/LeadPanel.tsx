import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { railThread, cn, Toast, type ToastProps, t } from '@ab/web-kit';
import { leadByPhoneQuery } from '@/features/messaging/inbox/api/api';
import { FollowUpLine } from '@/features/messaging/inbox/lead/FollowUpLine';
import { LeadDataActions } from '@/features/messaging/inbox/lead/LeadDataActions';
import { LeadSummary } from '@/features/messaging/inbox/lead/LeadSummary';
import { SearchFromProfile } from '@/features/messaging/inbox/search';
import { QuickActions } from '@/features/messaging/inbox/composer/components/QuickActions';

export type LeadNotice = Pick<ToastProps, 'message' | 'tone'>;

export interface LeadPanelProps {
  phone: string;
  /** After registering, this panel unmounts as the thread becomes the guardian's. */
  onNotice?: (notice: LeadNotice) => void;
}

/** Guardians and teachers have no lead panel (R-LEAD-02/03/05/06). */
export function LeadPanel({ phone, onNotice }: LeadPanelProps) {
  const lead = useQuery(leadByPhoneQuery(phone));
  const [notice, setNotice] = useState<LeadNotice | null>(null);
  const onDone = (message: string, tone?: 'error') => {
    const next: LeadNotice = tone ? { message, tone } : { message };
    if (onNotice) onNotice(next);
    else setNotice(next);
  };

  return (
    <aside aria-label={t.inbox.leadPanel} className={cn('@container grid content-start gap-6', railThread)}>
      <SearchFromProfile />
      {lead.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {lead.isError && <p role="alert">{t.common.error}</p>}
      {lead.isSuccess && !lead.data && <p className="text-sm text-ink-3">{t.inbox.noLead}</p>}
      {lead.data && (
        <>
          <QuickActions lead={lead.data} onDone={onDone} />
          <FollowUpLine lead={lead.data} onDone={onDone} />
          <div className="grid gap-3">
            <LeadSummary lead={lead.data} />
            <LeadDataActions key={lead.data.id} lead={lead.data} onDone={onDone} />
          </div>
        </>
      )}
      {notice && <Toast {...notice} onDismiss={() => setNotice(null)} />}
    </aside>
  );
}
