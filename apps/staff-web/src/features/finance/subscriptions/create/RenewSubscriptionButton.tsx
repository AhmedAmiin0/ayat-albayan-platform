import { isPackageEnded } from '@ab/shared';
import { type StudentStatus } from '@ab/catalog';
import { renewalPricing } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Toast } from '@ab/web-kit/components/ui/overlay/toast';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { studentBalanceQuery } from '@/features/finance/subscriptions/api';
import { CreateSubscriptionDialog } from './CreateSubscriptionDialog';
import type { PickedStudent } from './StudentPicker';

export interface RenewSubscriptionButtonProps {
  student: PickedStudent & { status: StudentStatus };
  /** The page head's primary action (filled), else a secondary one. */
  primary?: boolean;
}

/**
 * «جدّد الاشتراك» on the student profile (owner 2026-10-15): once the package ended
 * (pending_renewal / expired), and ANY time the student has a package (owner 2026-11-17: the new
 * package starts on the day picked in the dialog). Opens «اشتراك جديد» for this student, the
 * calculator prefilled from the last package (the profile's balance query, its `current`).
 */
/** Package-ended, or a package to renew from (owner 2026-11-17: ANY time). */
const offered = (ended: boolean, balance: { current: unknown } | undefined): boolean =>
  ended || Boolean(balance?.current);

export function RenewSubscriptionButton({ student, primary = false }: RenewSubscriptionButtonProps) {
  const ended = isPackageEnded(student.status);
  const balance = useQuery(studentBalanceQuery(student.id));
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  if (!offered(ended, balance.data)) return null;
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
