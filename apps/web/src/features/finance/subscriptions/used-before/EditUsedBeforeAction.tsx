import { riyadhToday, usedBeforeEditOffered, type SubscriptionStatus } from '@ab/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Toast } from '@/components/ui/overlay/toast';
import { usePermissions } from '@/features/people/auth';
import { t } from '@/lib/i18n/i18n';
import { EditUsedBeforeDialog } from './EditUsedBeforeDialog';

/** What the card knows of the package: enough to offer the edit (the dialog reads the rest). */
export interface UsedBeforePackage {
  id: string;
  status: SubscriptionStatus | null;
  /** YYYY-MM-DD: a count > 0 only with a start before today (the create's rule). */
  starts_on: string;
  lessons_used_before?: number | undefined;
}

export interface EditUsedBeforeActionProps {
  pkg: UsedBeforePackage;
}

/**
 * The card's «تعديل عدد الحلقات المستخدمة» (owner 2026-11-02), for admins and assistants
 * (subscriptions.set_start_date); never on a cancelled package, nor on one starting today or later
 * with nothing to lower.
 */
export function EditUsedBeforeAction({ pkg }: EditUsedBeforeActionProps) {
  const allowed = usePermissions().can('subscriptions.set_start_date');
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saved = () => {
    setOpen(false);
    setToast(t.salesMoney.usedBeforeEdit.saved);
  };
  const offered = usedBeforeEditOffered({
    cancelled: pkg.status === 'cancelled',
    pastStart: pkg.starts_on < riyadhToday(),
    current: pkg.lessons_used_before ?? 0,
  });
  if (!allowed || !offered) return null;
  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)}>
        {t.salesMoney.usedBeforeEdit.action}
      </Button>
      {open && (
        <EditUsedBeforeDialog
          subscriptionId={pkg.id}
          onClose={() => setOpen(false)}
          onSaved={saved}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
