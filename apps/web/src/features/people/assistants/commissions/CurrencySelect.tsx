import { CURRENCY_ISOS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { currencySymbol } from '@/features/finance/subscriptions/format';

/** The academy pays in EGP; the site currencies follow (a commission keeps the package's own). */
const CURRENCIES = [...new Set(['EGP', ...CURRENCY_ISOS])];

type Props = { label: string; value: string; onChange: (currency: string) => void; error?: string | undefined };

export function CurrencySelect({ label, value, onChange, error }: Props) {
  return (
    <Field label={label} error={error}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c} value={c}>
              {`${currencySymbol(c)} (${c})`}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
