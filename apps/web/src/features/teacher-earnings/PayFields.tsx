import { PAYMENT_METHODS, type PaymentMethod } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';

export type PayForm = {
  /** Text while typing (Arabic digits too); checkAmount reads it on submit. */
  amount: string;
  method: PaymentMethod;
  /** Local day (YYYY-MM-DD); paidAtFor turns it into an instant. */
  day: string;
  note: string;
};

type Props = { form: PayForm; set: (patch: Partial<PayForm>) => void; today: string; amountError: string | null };

/** Amount (EGP), method, date and note of a teacher payment. */
export function PayFields({ form, set, today, amountError }: Props) {
  const tt = t.teacherEarnings;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={tt.payAmount} error={amountError ?? undefined}>
        {(p) => (
          <Input {...p} type="text" inputMode="decimal" dir="ltr" value={form.amount} required onChange={(e) => set({ amount: e.target.value })} />
        )}
      </Field>
      <Field label={tt.method}>
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
      <Field label={tt.paidAt} hint={dateLabel(form.day)}>
        {(p) => <Input {...p} type="date" dir="ltr" max={today} value={form.day} onChange={(e) => set({ day: e.target.value })} />}
      </Field>
      <Field label={tt.note}>{(p) => <Input {...p} value={form.note} onChange={(e) => set({ note: e.target.value })} />}</Field>
    </div>
  );
}
