import { PAYMENT_METHODS, type PaymentMethod, type StudentBalanceView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { useNow } from '@/today/use-day-lessons';
import { Button } from '@/ui/Button';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { AmountField } from './AmountField';
import { FormLabel } from './FormLabel';
import { PackagePicker } from './PackagePicker';
import { PaidDayPicker } from './PaidDayPicker';
import { paymentErrorText } from './payment-errors';
import { checkDraft, chosenPackage, emptyDraft, payablePackages, type PaymentDraft } from './payment-form';
import { ReceiptPicker } from './ReceiptPicker';
import { useRecordPayment } from './use-record-payment';

// '' = no method picked yet: the receipt says which one, so none is preselected.
const methodPills = (): FilterPill<PaymentMethod | ''>[] => PAYMENT_METHODS.map((m) => ({
  value: m,
  label: t.enums.paymentMethod[m],
}));

/** While saving: «بيترفع…» when a receipt goes up first, else «جاري الحفظ…». */
function submitLabel(pending: boolean, draft: PaymentDraft): string {
  if (!pending) return t.payments.mobile.record;
  return draft.receipt ? t.payments.uploading : t.common.saving;
}

export interface PaymentFormProps {
  studentId: string;
  /** Has a current package (the screen shows the empty state otherwise). */
  balance: StudentBalanceView;
  /** The last read got no answer from the network: nothing may be sent until a retry gets one. */
  offline: boolean;
  onRetry: () => void;
  /** After the API recorded the payment. */
  onDone: () => void;
}

/**
 * «سجّل دفعة» (R-PAY-01, R-MOB-02): package, amount in its currency, method, day, receipt photo.
 * Errors show once a save was tried; a refused save keeps everything typed and picked.
 */
export function PaymentForm({ studentId, balance, offline, onRetry, onDone }: PaymentFormProps) {
  const now = useNow();
  const record = useRecordPayment(studentId);
  const [draft, setDraft] = useState<PaymentDraft>(emptyDraft);
  const [tried, setTried] = useState(false);
  const sub = chosenPackage(balance, draft.subscriptionId);
  if (!sub) return null;
  const check = checkDraft(draft, { sub, now });
  const errors = tried ? check.errors : {};
  const set = (patch: Partial<PaymentDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    setTried(true);
    if (check.input) record.mutate(check.input, { onSuccess: onDone });
  };
  const failure = offline
    ? t.payments.mobile.offline
    : record.isError
      ? paymentErrorText(record.error)
      : undefined;

  return (
    <View style={{ gap: 20 }}>
      <PackagePicker
        packages={payablePackages(balance)}
        value={sub}
        onChange={(subscriptionId) => set({ subscriptionId })}
      />
      <AmountField
        value={draft.amountText}
        onChange={(amountText) => set({ amountText })}
        currency={sub.currency}
        error={errors.amount}
      />
      <View style={{ gap: 6 }}>
        <FormLabel>{t.payments.method}</FormLabel>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.payments.method}
          items={methodPills()}
          value={draft.method ?? ''}
          onChange={(method) => (method ? set({ method }) : undefined)}
        />
        {errors.method ? <ErrorLine message={errors.method} /> : null}
      </View>
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      <ReceiptPicker receipt={draft.receipt} onChange={(receipt) => set({ receipt })} />
      {failure ? <ErrorLine message={failure} /> : null}
      {offline ? (
        <Button variant="secondary" label={t.mobile.retry} onPress={onRetry} />
      ) : (
        <Button label={submitLabel(record.isPending, draft)} onPress={submit} busy={record.isPending} />
      )}
    </View>
  );
}
