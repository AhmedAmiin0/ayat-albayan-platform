import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { railXl } from '@/components/ui/layout/rail';
import { cn } from '@/lib/utils';
import { Toast, type ToastProps } from '@/components/ui/overlay/toast';
import { t } from '@/lib/i18n/i18n';
import { leadByPhoneQuery } from '../api/api';
import { FollowUpLine } from './FollowUpLine';
import { LeadDataActions } from './LeadDataActions';
import { LeadSummary } from './LeadSummary';
import { QuickActions } from '../composer/components/QuickActions';

export type LeadNotice = Pick<ToastProps, 'message' | 'tone'>;

export interface LeadPanelProps {
  phone: string;
  /**
   * Where the panel's toasts go. ThreadPane passes its own: after «تسجيل الطالب» the thread
   * becomes the guardian's and this panel unmounts, so its own toast would vanish with it.
   */
  onNotice?: (notice: LeadNotice) => void;
}

/**
 * The lead beside the thread (R-LEAD-02/03/05/06), kept short: next actions, the automatic
 * follow-up, the student's key facts, then «تسجيل الطالب» / «تعديل البيانات» in dialogs.
 * Guardians and teachers have no lead panel.
 */
export function LeadPanel({ phone, onNotice }: LeadPanelProps) {
  const lead = useQuery(leadByPhoneQuery(phone));
  const [notice, setNotice] = useState<LeadNotice | null>(null);
  const onDone = (message: string, tone?: 'error') => {
    const next: LeadNotice = tone ? { message, tone } : { message };
    if (onNotice) onNotice(next);
    else setNotice(next);
  };

  return (
    <aside aria-label={t.inbox.leadPanel} className={cn('@container grid content-start gap-6', railXl)}>
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
