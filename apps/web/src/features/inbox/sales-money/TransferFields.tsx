import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { dateLabel } from '@/features/schedule/tz';
import { t } from '@/lib/i18n';
import type { TransferForm } from './use-sales-payment';

type Props = {
  form: TransferForm;
  set: (patch: Partial<TransferForm>) => void;
  /** The package's currency: the only one a sales transfer is recorded in (read-only). */
  packageCurrency: string;
  today: string;
  amountError?: string | null;
};

/**
 * Amount, the package currency (fixed, owner 2026-10-12), transfer day (never in the future) and an
 * optional note; the method is always «bank».
 */
export function TransferFields({ form, set, packageCurrency, today, amountError }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={t.salesMoney.amount} error={amountError ?? undefined}>
        {(p) => (
          <Input {...p} type="text" inputMode="decimal" dir="ltr" value={form.amount} onChange={(e) => set({ amount: e.target.value })} required />
        )}
      </Field>
      <Field label={t.salesMoney.currency}>
        {(p) => <Input {...p} dir="ltr" value={packageCurrency} readOnly />}
      </Field>
      <Field label={t.salesMoney.paidOn} hint={dateLabel(form.day)}>
        {(p) => <Input {...p} type="date" dir="ltr" max={today} value={form.day} onChange={(e) => set({ day: e.target.value })} />}
      </Field>
      <Field label={t.salesMoney.note}>
        {(p) => <Input {...p} value={form.note} onChange={(e) => set({ note: e.target.value })} />}
      </Field>
    </div>
  );
}
