import { isPackageEnded, type StudentStatus } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Toast } from '@/components/ui/toast';
import { t } from '@/lib/i18n';
import { studentBalanceQuery } from './api';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import { renewalPricing } from './renewal-pricing';
import type { PickedStudent } from './StudentPicker';

export interface RenewSubscriptionButtonProps {
  student: PickedStudent & { status: StudentStatus };
  /** The page head's primary action (filled), else a secondary one. */
  primary?: boolean;
}

/**
 * «جدّد الاشتراك» on the student profile (owner 2026-10-15): only while the package ended
 * (pending_renewal / expired). Opens «اشتراك جديد» for this student, the calculator prefilled
 * from the last package (the profile's balance query, its `current`).
 */
export function RenewSubscriptionButton({ student, primary = false }: RenewSubscriptionButtonProps) {
  const ended = isPackageEnded(student.status);
  const balance = useQuery({ ...studentBalanceQuery(student.id), enabled: ended });
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  if (!ended) return null;
  return (
    <>
      <Button type="button" variant={primary ? 'primary' : 'secondary'} disabled={balance.isPending} onClick={() => setOpen(true)}>
        {t.students.renew}
      </Button>
      {open && (
        <CreateSubscriptionDialog
          student={student}
          initial={renewalPricing(balance.data?.current)}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false);
            setToast(t.subscriptions.saved);
          }}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
