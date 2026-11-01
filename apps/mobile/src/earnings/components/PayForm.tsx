import { PAYMENT_METHODS, earningIdsOf, payCeiling, type PaymentMethod, type TeacherEarningView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { AmountField } from '@/payments/components/AmountField';
import { FormLabel } from '@/payments/FormLabel';
import { PaidDayPicker } from '@/payments/components/PaidDayPicker';
import { ReceiptPicker } from '@/payments/ReceiptPicker';
import { useNow } from '@/core/lib/time/use-now';
import { Button } from '@/core/ui/primitives/Button';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { Note } from '@/core/ui/feedback/Note';
import { earningsErrorText } from '@/earnings/lib/earnings-errors';
import { egp } from '@/earnings/lib/format';
import { checkPayDraft, type PayDraft } from '@/earnings/lib/pay-draft';
import { usePayTeacher } from '@/earnings/hooks/use-pay-teacher';

const methodPills = (): FilterPill<PaymentMethod | ''>[] => PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

interface PayFormProps {
  teacherId: string;
  selected: ReadonlyMap<string, TeacherEarningView>;
  /** The whole outstanding balance (used when no session is ticked). */
  outstanding: number;
  onDone: (replayed: boolean) => void;
}

/**
 * «سجّل دفعة» for a teacher (admin): amount (default = what the ticked sessions owe; more than
 * that is refused here and by the API), method, day, receipt photo. A refused save keeps everything.
 */
export function PayForm({ teacherId, selected, outstanding, onDone }: PayFormProps) {
  const now = useNow();
  const ceiling = payCeiling(selected, outstanding);
  const pay = usePayTeacher(teacherId);
  const [draft, setDraft] = useState<PayDraft>({ amountText: String(ceiling), daysAgo: 0, receipt: null });
  const [tried, setTried] = useState(false);
  const check = checkPayDraft(draft, { ceiling, now, earningIds: earningIdsOf(selected) });
  const errors = tried ? check.errors : {};
  const set = (patch: Partial<PayDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const submit = () => {
    setTried(true);
    if (check.input) pay.mutate(check.input, { onSuccess: (r) => onDone(r.replayed) });
  };

  return (
    <View style={{ gap: 20 }}>
      <Note>
        {selected.size > 0
          ? t.earnings.chosenSummary.replace('{count}', String(selected.size)).replace('{amount}', egp(ceiling))
          : `${t.earnings.payAll}: ${egp(ceiling)}`}
      </Note>
      <AmountField value={draft.amountText} onChange={(amountText) => set({ amountText })} currency="EGP" {...(errors.amount ? { error: errors.amount } : {})} />
      <View style={{ gap: 6 }}>
        <FormLabel>{t.payments.method}</FormLabel>
        <FilterPills role="radiogroup" accessibilityLabel={t.payments.method} items={methodPills()} value={draft.method ?? ''} onChange={(method) => (method ? set({ method }) : undefined)} />
        {errors.method ? <ErrorLine message={errors.method} /> : null}
      </View>
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      <ReceiptPicker receipt={draft.receipt} onChange={(receipt) => set({ receipt })} />
      <Note>{t.earnings.allocation}</Note>
      {pay.isError ? <ErrorLine message={earningsErrorText(pay.error)} /> : null}
      <Button label={pay.isPending ? t.earnings.saving : t.earnings.confirm} onPress={submit} busy={pay.isPending} />
    </View>
  );
}
