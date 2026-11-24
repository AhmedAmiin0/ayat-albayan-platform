import type { SubscriptionStatus } from '@ab/catalog';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { usePermissions } from '@/features/people/auth';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { EditStartDateDialog, type StartDatePackage } from './EditStartDateDialog';

export interface EditStartDateActionProps {
  pkg: StartDatePackage & { status: SubscriptionStatus | null };
}

/** Only with subscriptions.edit_terms (not set_start_date alone), never on a cancelled package. */
export function EditStartDateAction({ pkg }: EditStartDateActionProps) {
  const allowed = usePermissions().can('subscriptions.edit_terms');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saved = () => {
    setOpen(false);
    setToast(t.salesMoney.startDateEdit.saved);
  };
  if (!allowed || pkg.status === 'cancelled') return null;
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t.salesMoney.startDateEdit.action}
      </Button>
      {open && <EditStartDateDialog pkg={pkg} onClose={() => setOpen(false)} onSaved={saved} />}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
