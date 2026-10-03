import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { railXl } from '@/components/ui/rail';
import { cn } from '@/lib/utils';
import { Toast, type ToastProps } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { leadByPhoneQuery } from './api';
import { FollowUpLine } from './FollowUpLine';
import { QualificationForm } from './QualificationForm';
import { QuickActions } from './QuickActions';

type Notice = Pick<ToastProps, 'message' | 'tone'>;

/**
 * The lead beside the thread (R-LEAD-02/03/05): next actions, the automatic follow-up and the
 * student's qualification. Guardians and teachers have no lead panel.
 */
export function LeadPanel({ phone }: { phone: string }) {
  const lead = useQuery(leadByPhoneQuery(phone));
  const [notice, setNotice] = useState<Notice | null>(null);
  const onDone = (message: string, tone?: 'error') =>
    setNotice(tone ? { message, tone } : { message });

  return (
    <aside aria-label={t.inbox.leadPanel} className={cn('grid content-start gap-6', railXl)}>
      {lead.isPending && <p className="text-sm text-ink-3">{t.common.loading}</p>}
      {lead.isError && <p role="alert">{t.common.error}</p>}
      {lead.isSuccess && !lead.data && <p className="text-sm text-ink-3">{t.inbox.noLead}</p>}
      {lead.data && (
        <>
          <QuickActions lead={lead.data} onDone={onDone} />
          <FollowUpLine lead={lead.data} onDone={onDone} />
          <QualificationForm key={lead.data.id} lead={lead.data} onDone={onDone} />
        </>
      )}
      {notice && <Toast {...notice} onDismiss={() => setNotice(null)} />}
    </aside>
  );
}
