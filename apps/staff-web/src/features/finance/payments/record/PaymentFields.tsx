import { PAYMENT_METHODS, type PaymentMethod } from '@ab/catalog';
import { Field, Input, Select, t } from '@ab/web-kit';
import { dateLabel } from '@/features/teaching/schedule';
import { currencySymbol } from '@/features/finance/subscriptions';

export interface PaymentForm {
  /** Text while typing (Arabic digits too); parseAmount reads it on submit. */
  amount: string;
  method: PaymentMethod;
  /** Local day (YYYY-MM-DD); paidAtFor turns it into an instant. */
  day: string;
  note: string;
}

type Props = {
  form: PaymentForm;
  set: (patch: Partial<PaymentForm>) => void;
  currency: string;
  today: string;
  amountError?: string | null;
  /** Set when the amount is shown but not edited here: says why (Stripe's, or «Edit amount»). */
  amountLockedReason?: string;
};

/** Amount (in the package currency, fixed in v1), method, date and note. */
export function PaymentFields(props: Props) {
  const { form, set, currency, today, amountError, amountLockedReason } = props;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label={`${t.payments.amount} (${currencySymbol(currency)})`}
        hint={amountLockedReason}
        error={amountError ?? undefined}
      >
        {(p) => (
          // Text, not type=number, so Arabic-Indic digits typed on an Arabic keyboard still parse.
          <Input
            {...p}
            type="text"
            inputMode="decimal"
            dir="ltr"
            value={form.amount}
            onChange={(e) => set({ amount: e.target.value })}
            disabled={amountLockedReason !== undefined}
            required
          />
        )}
      </Field>
      <Field label={t.payments.method}>
        {(p) => (
          <Select
            {...p}
            value={form.method}
            onChange={(e) => set({ method: e.target.value as PaymentMethod })}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {t.enums.paymentMethod[m]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.payments.paidAt} hint={dateLabel(form.day)}>
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
