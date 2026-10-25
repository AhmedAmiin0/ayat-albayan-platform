import { CURRENCY_ISOS, PAYMENT_METHODS, type PaymentMethod } from '@ab/shared';
import { CheckField } from '@/components/settings/fields/CheckField';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { currencySymbol } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n/i18n';
import { categoryLabel, type ExpenseCategoryView } from './api';
import type { ExpenseForm } from './expense-form';

/** The owner's tracker is in EGP; the site currencies are there for things paid abroad. */
const CURRENCIES = [...new Set(['EGP', ...CURRENCY_ISOS])];

type Props = {
  form: ExpenseForm;
  set: (patch: Partial<ExpenseForm>) => void;
  categories: readonly ExpenseCategoryView[];
  amountError?: string | undefined;
};

/** Category (the table's, admin-extendable), amount, currency, paid day, vendor, method, note, «تكرار شهري». */
export function ExpenseFields({ form, set, categories, amountError }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.expenses.category}>
        {(p) => (
          <Select {...p} value={form.category} onChange={(e) => set({ category: e.target.value })}>
            {categories.filter((c) => c.active || c.key === form.category).map((c) => (
              <option key={c.key} value={c.key}>
                {categoryLabel(categories, c.key)}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.expenses.amount} error={amountError}>
        {(p) => <Input {...p} type="text" inputMode="decimal" dir="ltr" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />}
      </Field>
      <Field label={t.expenses.currency}>
        {(p) => (
          <Select {...p} value={form.currency} onChange={(e) => set({ currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {`${currencySymbol(c)} (${c})`}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.finance.paidOn}>
        {(p) => <Input {...p} type="date" dir="ltr" value={form.paidOn} onChange={(e) => set({ paidOn: e.target.value })} />}
      </Field>
      <Field label={t.finance.vendor}>{(p) => <Input {...p} value={form.vendor} onChange={(e) => set({ vendor: e.target.value })} />}</Field>
      <Field label={t.payments.method}>
        {(p) => (
          <Select {...p} value={form.method} onChange={(e) => set({ method: e.target.value as PaymentMethod | '' })}>
            <option value="">—</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t.enums.paymentMethod[m]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.expenses.note}>{(p) => <Input {...p} value={form.note} onChange={(e) => set({ note: e.target.value })} />}</Field>
      <CheckField label={t.finance.recurringLabel} checked={form.recurring} onChange={(v) => set({ recurring: v })} hint={t.finance.recurringHint} />
    </div>
  );
}
