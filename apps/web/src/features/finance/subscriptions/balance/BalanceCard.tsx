import { subscriptionStatusStyle } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { FormAlert } from '@/components/ui/form/form-alert';
import { StatusChip } from '@/components/ui/display/status-chip';
import { Toast } from '@/components/ui/overlay/toast';
import { RecordPaymentDialog } from '@/features/finance/payments/record/RecordPaymentDialog';
import { t } from '@/lib/i18n/i18n';
import { studentBalanceQuery } from '../api';
import { BalanceDetails } from './BalanceDetails';
import { CreateSubscriptionDialog } from '../create/CreateSubscriptionDialog';
import { unpaidFlagged } from '../format';
import type { PickedStudent } from '../create/StudentPicker';

/**
 * The student's packages (S6, R-SUB-01/03) on the profile: the package line (packageProgress),
 * «الباقة مش مدفوعة» (R-SUB-02), record a payment on the current package, or a new package.
 */
export function BalanceCard({ student }: { student: PickedStudent }) {
  const balance = useQuery(studentBalanceQuery(student.id));
  const [dialog, setDialog] = useState<'pay' | 'new' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saved = (message: string) => () => {
    setDialog(null);
    setToast(message);
  };
  if (balance.isError) return <FormAlert className="mb-6">{t.common.error}</FormAlert>;
  const view = balance.data;
  const current = view?.current ?? null;
  const owes = current !== null && current.paid < current.price;

  return (
    <section aria-labelledby="balance-title" className="mb-6 grid gap-2 border-b border-rule pb-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="balance-title" className="font-display text-h3 font-bold">
          {t.subscriptions.balance}
        </h2>
        {current && (
          <StatusChip size="sm" {...subscriptionStatusStyle[current.status]} label={t.enums.subscriptionStatus[current.status]} />
        )}
        {view && unpaidFlagged(current, view.remaining) && (
          <StatusChip size="sm" tone="act" glyph="struck" label={t.subscriptions.unpaidFlag} />
        )}
        <div className="ms-auto flex gap-2">
          {owes && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setDialog('pay')}>
              {t.payments.record}
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog('new')}>
            {t.subscriptions.new}
          </Button>
        </div>
      </div>
      {view && !current && <p className="text-sm text-ink-3">{t.subscriptions.empty}</p>}
      {view && current && <BalanceDetails view={view} current={current} />}
      {dialog === 'pay' && current && (
        <RecordPaymentDialog subscription={current} onClose={() => setDialog(null)} onSaved={saved(t.payments.saved)} />
      )}
      {dialog === 'new' && (
        <CreateSubscriptionDialog student={student} onClose={() => setDialog(null)} onSaved={saved(t.subscriptions.saved)} />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </section>
  );
}
