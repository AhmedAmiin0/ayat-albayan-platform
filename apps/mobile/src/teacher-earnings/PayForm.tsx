import { formatAmount, PAYMENT_METHODS, type PaymentMethod } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { earningsErrorText } from './earnings-errors';
import { checkAmount } from './pay-form';
import { egp } from './text';
import { usePayTeacher } from './use-pay-teacher';

export interface PayFormProps {
  /** `/teachers/:id`. */
  base: string;
  /** What is owed on the chosen sessions: the amount starts here and may not go above it. */
  due: number;
  /** The ticked sessions; omitted = every open session. */
  earningIds?: string[];
  onDone: () => void;
}

// '' = none picked yet: the admin chooses, nothing is preselected.
const methods: FilterPill<PaymentMethod | ''>[] = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));

/**
 * The pay dialog's body: amount (prefilled with what is due), method, note. Errors show once a
 * save was tried; a refused save keeps everything typed and re-sends the same clientRequestId.
 */
export function PayForm({ base, due, earningIds, onDone }: PayFormProps) {
  const pay = usePayTeacher(base);
  const [amountText, setAmountText] = useState(formatAmount(due));
  const [method, setMethod] = useState<PaymentMethod | undefined>();
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);
  const check = checkAmount(amountText, due);
  const methodError = tried && !method ? t.common.required : undefined;

  const submit = () => {
    setTried(true);
    if (check.amount === undefined || !method) return;
    const text = note.trim();
    pay.mutate(
      { amount: check.amount, method, ...(text ? { note: text } : {}), ...(earningIds ? { earningIds } : {}) },
      { onSuccess: onDone },
    );
  };

  return (
    <View style={{ gap: 20 }}>
      <Note>{t.teacherEarnings.selectedDue.replace('{amount}', egp(due))}</Note>
      <View style={{ gap: 6 }}>
        <Field
          label={t.teacherEarnings.payAmount}
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="decimal-pad"
          maxLength={13}
          ltr
        />
        {tried && check.error ? <ErrorLine message={check.error} /> : null}
        <Note>{t.teacherEarnings.allocationHint}</Note>
      </View>
      <View style={{ gap: 6 }}>
        <FormLabel>{t.teacherEarnings.method}</FormLabel>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.teacherEarnings.method}
          items={methods}
          value={method ?? ''}
          onChange={(m) => (m ? setMethod(m) : undefined)}
          wrap
        />
        {methodError ? <ErrorLine message={methodError} /> : null}
      </View>
      <Field label={t.teacherEarnings.note} value={note} onChangeText={setNote} multiline maxLength={500} />
      {pay.isError ? <ErrorLine message={earningsErrorText(pay.error)} /> : null}
      <Button
        label={pay.isPending ? t.common.saving : t.teacherEarnings.submit}
        onPress={submit}
        busy={pay.isPending}
      />
    </View>
  );
}
