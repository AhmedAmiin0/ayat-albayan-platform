import { cancelOffered, owesMore, subscriptionStatusStyle } from '@ab/money';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, FormAlert, StatusChip, Toast, t } from '@ab/web-kit';
import { RecordPaymentDialog } from '@/features/finance/payments';
import { cancelSubscription, studentBalanceQuery } from '@/features/finance/subscriptions/api';
import { CancelPackageDialog } from '@/features/finance/subscriptions/cancel/CancelPackageDialog';
import { BalanceDetails } from '@/features/finance/subscriptions/balance/BalanceDetails';
import { EditUsedBeforeAction } from '@/features/finance/subscriptions/used-before/EditUsedBeforeAction';
import { EditStartDateAction } from '@/features/finance/subscriptions/start-date/EditStartDateAction';
import { CreateSubscriptionDialog } from '@/features/finance/subscriptions/create/CreateSubscriptionDialog';
import { packageName, unpaidFlagged } from '@/features/finance/subscriptions/format';
import type { PickedStudent } from '@/features/finance/subscriptions/create/StudentPicker';

/** Packages on the profile (R-SUB-01/02/03); cancel only when made by mistake with nothing paid. */
export function BalanceCard({ student }: { student: PickedStudent }) {
  const balance = useQuery(studentBalanceQuery(student.id));
  const [dialog, setDialog] = useState<'pay' | 'new' | 'cancel' | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saved = (message: string) => () => {
    setDialog(null);
    setToast(message);
  };
  if (balance.isError) return <FormAlert className="mb-6">{t.common.error}</FormAlert>;
  const view = balance.data;
  const current = view?.current ?? null;
  const owes = current !== null && owesMore(current);

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
          {current && (
            <EditUsedBeforeAction pkg={current} />
          )}
          {current && <EditStartDateAction pkg={current} />}
          {current && cancelOffered(current) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setDialog('cancel')}>
              {t.subscriptions.cancel.action}
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
        <RecordPaymentDialog
          subscription={current}
          onClose={() => setDialog(null)}
          onSaved={saved(t.payments.saved)}
        />
      )}
      {dialog === 'cancel' && current && (
        <CancelPackageDialog
          label={`${packageName(current)} · ${student.name}`}
          cancel={(body) => cancelSubscription(current.id, body)}
          onClose={() => setDialog(null)}
          onDone={saved(t.subscriptions.cancel.done)}
        />
      )}
      {dialog === 'new' && (
        <CreateSubscriptionDialog
          student={student}
          onClose={() => setDialog(null)}
          onSaved={saved(t.subscriptions.saved)}
        />
      )}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </section>
  );
}
