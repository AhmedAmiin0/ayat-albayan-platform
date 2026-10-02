import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { reclassifyLead } from '@/features/leads/leads.api';
import { ReclassifyConfirm } from '@/features/leads/ReclassifyConfirm';
import { t } from '@/lib/i18n';
import type { InboxLead } from './api';
import { LeadStatusChange } from './LeadStatusChange';

export interface QuickActionsProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

/**
 * What the admin does next from the thread: «حجز حلقة تجريبية» (the Phase 2 wizard with this
 * lead, R-LEAD-06), change the status, or move the number to job applicants (R-LEAD-04).
 */
export function QuickActions({ lead, onDone }: QuickActionsProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const reclassify = useMutation({
    mutationFn: reclassifyLead,
    onSuccess: async () => {
      setConfirming(false);
      onDone(t.leads.reclassified);
      for (const key of ['leads', 'threads', 'job-applicants']) await queryClient.invalidateQueries({ queryKey: [key] });
    },
    onError: () => onDone(t.common.error, 'error'),
  });
  const open = lead.status !== 'converted' && lead.status !== 'lost';

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold">{t.common.actions}</h3>
      {open && (
        <Link
          to="/admin/book"
          search={{ leadId: lead.id, phone: lead.phone_e164, name: lead.name ?? undefined }}
          className={buttonVariants({ variant: 'secondary', className: 'justify-self-start' })}
        >
          <Icon name="calendar" />
          {t.booking.trialTitle}
        </Link>
      )}
      <LeadStatusChange lead={lead} onDone={onDone} />
      <Button
        variant="ghost"
        size="sm"
        className="justify-self-start"
        aria-expanded={confirming}
        onClick={() => setConfirming(true)}
      >
        <Icon name="brief" />
        {t.leads.reclassifyAsApplicant}
      </Button>
      {confirming && (
        <div>
          <ReclassifyConfirm
            busy={reclassify.isPending}
            onKeep={() => setConfirming(false)}
            onMove={() => reclassify.mutate(lead.id)}
          />
        </div>
      )}
    </div>
  );
}
