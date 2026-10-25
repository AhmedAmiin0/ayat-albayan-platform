import { PAYMENT_METHODS, type ExpenseCategoryView, type PaymentMethod } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { AmountField } from '@/payments/AmountField';
import { FormLabel } from '@/payments/FormLabel';
import { PaidDayPicker } from '@/payments/PaidDayPicker';
import { ReceiptPicker } from '@/payments/ReceiptPicker';
import { useNow } from '@/today/use-day-lessons';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { activeCategories, categoryLabel } from './categories';
import { checkExpense, emptyExpense, type ExpenseDraft } from './expense-draft';
import { financeErrorText } from '../shared/errors';
import { useAddExpense } from './use-add-expense';

export interface ExpenseFormProps {
  categories: readonly ExpenseCategoryView[] | undefined;
  onDone: () => void;
}

/** «مصروف جديد»: category, amount (EGP), paid day, vendor, method, note and the receipt photo. */
export function ExpenseForm({ categories, onDone }: ExpenseFormProps) {
  const now = useNow();
  const add = useAddExpense();
  const [draft, setDraft] = useState<ExpenseDraft>(emptyExpense());
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<ExpenseDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const { errors, ok } = checkExpense(draft);
  const shown = tried ? errors : {};
  const methods = PAYMENT_METHODS.map((m) => ({ value: m, label: t.enums.paymentMethod[m] }));
  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 6 }}>
        <FormLabel required>{t.expenses.category}</FormLabel>
        <FilterPills
          role="radiogroup"
          wrap
          accessibilityLabel={t.expenses.category}
          items={activeCategories(categories).map((c) => ({ value: c.key, label: categoryLabel(categories, c.key) }))}
          value={draft.category}
          onChange={(category) => set({ category })}
        />
        {shown.category ? <ErrorLine message={shown.category} /> : null}
      </View>
      <AmountField value={draft.amountText} onChange={(amountText) => set({ amountText })} currency="EGP" {...(shown.amount ? { error: shown.amount } : {})} />
      <Note>{t.mobileFinance.expenses.currencyNote}</Note>
      <PaidDayPicker daysAgo={draft.daysAgo} onChange={(daysAgo) => set({ daysAgo })} now={now} />
      <Field label={t.finance.vendor} value={draft.vendor} onChangeText={(vendor) => set({ vendor })} maxLength={200} />
      <View style={{ gap: 6 }}>
        <FormLabel>{t.payments.method}</FormLabel>
        <FilterPills
          role="radiogroup"
          wrap
          accessibilityLabel={t.payments.method}
          items={methods}
          value={draft.method ?? ('' as PaymentMethod)}
          onChange={(method) => set({ method: method === draft.method ? null : method })}
        />
      </View>
      <Field label={t.expenses.note} value={draft.note} onChangeText={(note) => set({ note })} maxLength={500} />
      <ReceiptPicker receipt={draft.receipt} onChange={(receipt) => set({ receipt })} />
      {add.isError ? <ErrorLine message={financeErrorText(add.error)} /> : null}
      <Button
        label={add.isPending ? t.earnings.saving : t.mobileFinance.expenses.save}
        busy={add.isPending}
        onPress={() => {
          setTried(true);
          if (ok) add.mutate(draft, { onSuccess: onDone });
        }}
      />
    </View>
  );
}
