import { PAYMENT_METHODS, type PayoutView, type PaymentMethod } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { PaidDayPicker } from '@/payments/PaidDayPicker';
import { ReceiptPicker } from '@/payments/ReceiptPicker';
import { useNow } from '@/today/use-day-lessons';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { financeErrorText } from './errors';
import { amountText } from './format';
import { dueOf, type PayDraft } from './payout-actions';
import { usePayPayout } from './use-payout-move';

const methodPills = (): FilterPill<PaymentMethod>[] => PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

/**
 * «تأكيد الدفع» of a monthly payout: how it was paid, the day, a note, the receipt photo. The amount
 * is not typed: the server settles what the per-session payments left, in one transaction.
 */
export function PayoutPayForm({ payout, onDone }: { payout: PayoutView; onDone: () => void }) {
  const now = useNow();
  const pay = usePayPayout(payout);
  const [draft, setDraft] = useState<PayDraft>({ method: 'bank', daysAgo: 0, note: '', receipt: null });
  const set = (patch: Partial<PayDraft>) => setDraft((d) => ({ ...d, ...patch }));
  return (
    <View style={{ gap: 20 }}>
      <Note>{t.finance.payPayoutDue.replace('{month}', payout.month).replace('{amount}', amountText(dueOf(payout)))}</Note>
      <View style={{ gap: 6 }}>
        <FormLabel>{t.payments.method}</FormLabel>
        <FilterPills role="radiogroup" accessibilityLabel={t.payments.method} items={methodPills()} value={draft.method} onChange={(method) => set({ method })} wrap />
      </View>
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      <Field label={t.payments.note} value={draft.note} onChangeText={(note) => set({ note })} maxLength={500} />
      <ReceiptPicker receipt={draft.receipt} onChange={(receipt) => set({ receipt })} />
      {pay.isError ? <ErrorLine message={financeErrorText(pay.error)} /> : null}
      <Button
        label={pay.isPending ? t.earnings.saving : t.finance.confirmPaid}
        busy={pay.isPending}
        onPress={() => pay.mutate(draft, { onSuccess: onDone })}
      />
    </View>
  );
}
