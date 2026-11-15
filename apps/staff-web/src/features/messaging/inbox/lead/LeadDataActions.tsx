import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { CreateStudentDialog } from '@/features/people/students/create/CreateStudentDialog';
import { t } from '@/lib/i18n/i18n';
import type { InboxLead } from '@/features/messaging/inbox/api/api';
import { registerInitial } from './lead-summary';
import { QualificationForm } from './qualification/QualificationForm';

export interface LeadDataActionsProps {
  lead: InboxLead;
  onDone: (message: string, tone?: 'error') => void;
}

/**
 * The aside's two doors (R-LEAD-03, R-LEAD-06, R-STU-02): «تسجيل الطالب» opens the short student
 * form pre-filled from the lead (the lead is converted and linked to the new guardian), and
 * «تعديل البيانات» opens every qualification question in a dialog, out of the aside's way.
 */
export function LeadDataActions({ lead, onDone }: LeadDataActionsProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState<'register' | 'edit' | null>(null);

  const registered = (notice: string) => {
    setOpen(null);
    onDone(notice);
    // The thread now belongs to a guardian: the aside becomes the family's panel.
    for (const key of ['leads', 'threads']) void queryClient.invalidateQueries({ queryKey: [key] });
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={() => setOpen('register')}>
        {t.inbox.registerStudent}
      </Button>
      <Button type="button" variant="secondary" onClick={() => setOpen('edit')}>
        {t.inbox.editLeadData}
      </Button>
      {open === 'register' && (
        <CreateStudentDialog
          title={t.inbox.registerStudent}
          initial={registerInitial(lead)}
          leadId={lead.id}
          onClose={() => setOpen(null)}
          onDone={registered}
        />
      )}
      {open === 'edit' && (
        <Dialog title={t.inbox.editLeadDataTitle} onClose={() => setOpen(null)} className="max-w-[640px]">
          <QualificationForm
            key={lead.id}
            lead={lead}
            onDone={(message, tone) => {
              onDone(message, tone);
              if (!tone) setOpen(null);
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
