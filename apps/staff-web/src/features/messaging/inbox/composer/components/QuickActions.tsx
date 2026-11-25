import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useState } from 'react';
import { Button, buttonVariants } from '@ab/web-kit/components/ui/form/button';
import { Icon } from '@ab/web-kit/components/ui/display/icon';
import { usePermissions } from '@/features/people/auth';
import { reclassifyLead } from '@/features/sales/leads/leads.api';
import { applicantKeys, leadKeys } from '@/features/sales/keys';
import { ReclassifyConfirm } from '@/features/sales/leads/list/ReclassifyConfirm';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import type { InboxLead } from '@/features/messaging/inbox/api/api';
import { threadKeys } from '@/features/messaging/inbox/api/keys';
import { LeadStatusChange } from '@/features/messaging/inbox/lead/LeadStatusChange';
import { LinkFamilyDialog } from '@/features/messaging/inbox/lead/LinkFamilyDialog';

export interface QuickActionsProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

const linkClass = buttonVariants({ variant: 'secondary', className: 'justify-self-start' });

/** Next steps from the thread (R-LEAD-04, R-LEAD-06, R-SUB-01); linking needs a familyless chat. */
export function QuickActions({ lead, onDone }: QuickActionsProps) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const [linking, setLinking] = useState(false);
  const { can } = usePermissions();
  // The picker searches with GET /sales/registration-check: without that key it could only fail.
  const linkable = can('leads.link_family') && can('students.check_registration');
  const reclassify = useMutation({
    mutationFn: reclassifyLead,
    onSuccess: async () => {
      setConfirming(false);
      onDone(t.leads.reclassified);
      for (const queryKey of [leadKeys.all, threadKeys.all, applicantKeys.all])
        await queryClient.invalidateQueries({ queryKey });
    },
    onError: () => onDone(t.common.error, 'error'),
  });
  const open = lead.status !== 'converted' && lead.status !== 'lost';
  // A converted lead on this number has no family here yet, so it can still subscribe.
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
        <Button
          type="button"
          variant="secondary"
          className="justify-self-start"
          onClick={() => setLinking(true)}
        >
          <Icon name="users" />
          {t.inbox.linkFamily.action}
        </Button>
      )}
      {linking && (
        <LinkFamilyDialog
          leadId={lead.id}
          phone={lead.phone_e164}
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
