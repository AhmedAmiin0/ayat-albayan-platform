import { PAYMENT_METHODS, type PaymentMethod } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { currencySymbol } from '@/features/subscriptions/format';
import { t } from '@/lib/i18n';

export interface PaymentForm {
  /** Text while typing; parsed on submit. */
  amount: string;
  method: PaymentMethod;
  /** Local day (YYYY-MM-DD); paidAtFor turns it into an instant. */
  day: string;
  note: string;
}

type Props = { form: PaymentForm; set: (patch: Partial<PaymentForm>) => void; currency: string; today: string };

/** Amount (in the package currency, fixed in v1), method, date and note. */
export function PaymentFields({ form, set, currency, today }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={`${t.payments.amount} (${currencySymbol(currency)})`}>
        {(p) => (
          <Input
            {...p}
            type="number"
            inputMode="decimal"
            dir="ltr"
            min={0}
            step="0.01"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            required
          />
        )}
      </Field>
      <Field label={t.payments.method}>
        {(p) => (
          <Select {...p} value={form.method} onChange={(e) => set({ method: e.target.value as PaymentMethod })}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t.enums.paymentMethod[m]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.payments.paidAt}>
        {(p) => (
          <Input {...p} type="date" dir="ltr" max={today} value={form.day} onChange={(e) => set({ day: e.target.value })} />
        )}
      </Field>
      <Field label={t.payments.note}>
        {(p) => <Input {...p} value={form.note} onChange={(e) => set({ note: e.target.value })} />}
      </Field>
    </div>
  );
}
