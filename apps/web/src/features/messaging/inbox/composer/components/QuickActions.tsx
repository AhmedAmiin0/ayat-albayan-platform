import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/form/button';
import { Icon } from '@/components/ui/display/icon';
import { usePermissions } from '@/features/people/auth';
import { reclassifyLead } from '@/features/sales/leads/leads.api';
import { ReclassifyConfirm } from '@/features/sales/leads/list/ReclassifyConfirm';
import { t } from '@/lib/i18n/i18n';
import type { InboxLead } from '../../api/api';
import { LeadStatusChange } from '../../lead/LeadStatusChange';
import { LinkFamilyDialog } from '../../lead/LinkFamilyDialog';

export interface QuickActionsProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

const linkClass = buttonVariants({ variant: 'secondary', className: 'justify-self-start' });

/**
 * What the admin does next from the thread: «حجز حلقة تجريبية» or «اشترك» (the Phase 2 wizard with
 * this lead and a trial or a regular package, R-LEAD-06, R-SUB-01; the booked panel then offers the
 * subscription), «ربط بطالب موجود» (leads.link_family: this number becomes an existing family's second number;
 * the lead panel only shows on a chat with no family, i.e. canLinkFamily), change the status, or move the
 * number to job applicants (R-LEAD-04).
 */
export function QuickActions({ lead, onDone }: QuickActionsProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [linking, setLinking] = useState(false);
  const linkable = usePermissions().can('leads.link_family');
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
  // A converted lead on this number has no family here yet («مش مشترك»): it can still subscribe.
  const subscribe = lead.status !== 'lost';
  const book = { leadId: lead.id, phone: lead.phone_e164, name: lead.name ?? undefined };

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-semibold">{t.common.actions}</h3>
      {open && (
        <Link to="/admin/book" search={book} className={linkClass}>
          <Icon name="calendar" />
          {t.booking.trialTitle}
        </Link>
      )}
      {subscribe && (
        <Link to="/admin/book" search={{ ...book, pkg: '8' }} className={linkClass}>
          <Icon name="card" />
          {t.inbox.subscription.subscribe}
        </Link>
      )}
      {linkable && (
        <Button type="button" variant="secondary" className="justify-self-start" onClick={() => setLinking(true)}>
          <Icon name="users" />
          {t.inbox.linkFamily.action}
        </Button>
      )}
      {linking && (
        <LinkFamilyDialog
          leadId={lead.id}
          onClose={() => setLinking(false)}
          onDone={(text) => {
            setLinking(false);
            onDone(text);
          }}
        />
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
