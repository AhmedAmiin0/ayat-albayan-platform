import type { SalesMoneySubscriptionView, SalesPaymentView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { AmountField } from '@/payments/components/AmountField';
import { PaidDayPicker } from '@/payments/components/PaidDayPicker';
import { ShortfallNote } from '@/payments';
import { useNow } from '@/core/lib/time/use-now';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { SalesReceiptField } from './SalesReceiptField';
import { salesErrorText } from '../lib/sales-errors';
import { checkTransfer, draftFor, type TransferDraft } from '../lib/transfer-form';
import { useSalesPayment } from '../hooks/use-sales-payment';

interface TransferFormProps {
  sub: SalesMoneySubscriptionView;
  phone: string;
  onDone: (payment: SalesPaymentView) => void;
}

/**
 * The bank transfer for one package: «المرفقات» (optional, up to 5), amount (the due, prefilled) in the
 * package currency (shown, never asked), day, note. Errors show once a save was tried; a refused save keeps everything entered.
 */
export function TransferForm({ sub, phone, onDone }: TransferFormProps) {
  const now = useNow();
  const pay = useSalesPayment(phone);
  const [draft, setDraft] = useState(() => draftFor(sub));
  const [tried, setTried] = useState(false);
  const check = checkTransfer(draft, { sub, now });
  const errors = tried ? check.errors : {};
  const set = (patch: Partial<TransferDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    setTried(true);
    if (check.input) pay.mutate(check.input, { onSuccess: onDone });
  };
  const m = t.salesMoney;

  return (
    <View style={{ gap: 20 }}>
      <SalesReceiptField
        target={{ studentId: sub.student.id, subscriptionId: sub.id }}
        value={draft.attachments}
        onChange={(attachments) => set({ attachments })}
      />
      <AmountField
        value={draft.amountText}
        onChange={(amountText) => set({ amountText })}
        currency={sub.currency}
        error={errors.amount}
      />
      <ShortfallNote amountText={draft.amountText} due={sub.due} currency={sub.currency} />
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      <Field label={m.note} value={draft.note} onChangeText={(note) => set({ note })} maxLength={500} multiline />
      {pay.isError ? <ErrorLine message={salesErrorText(pay.error)} /> : null}
      <Button label={pay.isPending ? m.saving : m.saveTransfer} busy={pay.isPending} onPress={submit} />
    </View>
  );
}
