import { t } from '@/lib/i18n';
import { Section } from '@/more/Section';
import { currencyName } from '@/payments/format';
import { FilterPills } from '@/ui/FilterPills';
import { currencyChoices } from './transfer-form';

export interface CurrencyPillsProps {
  /** The package's currency (first, preselected). */
  packageCurrency: string;
  value: string;
  onChange: (currency: string) => void;
}

/** «العملة» the family transferred in; another than the package's is converted by the API. */
export function CurrencyPills({ packageCurrency, value, onChange }: CurrencyPillsProps) {
  return (
    <Section title={t.salesMoney.currency}>
      <FilterPills
        wrap
        role="radiogroup"
        accessibilityLabel={t.salesMoney.currency}
        items={currencyChoices(packageCurrency).map((c) => ({ value: c, label: currencyName(c) }))}
        value={value}
        onChange={onChange}
      />
    </Section>
  );
}
