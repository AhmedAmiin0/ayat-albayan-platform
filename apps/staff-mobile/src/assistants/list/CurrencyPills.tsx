import { View } from 'react-native';
import { FilterPills, ErrorLine, currencyName, FormLabel } from '@ab/mobile-kit';
import { TERM_CURRENCIES } from '@/assistants/terms/terms-form';

interface CurrencyPillsProps {
  label: string;
  value: string;
  onChange: (currency: string) => void;
  error?: string | undefined;
}

/** The term's currency (web CurrencySelect): EGP first, then the site currencies, all in view. */
export function CurrencyPills({ label, value, onChange, error }: CurrencyPillsProps) {
  const items = TERM_CURRENCIES.map((c) => ({ value: c, label: `${currencyName(c)} (${c})` }));
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <FilterPills role="radiogroup" accessibilityLabel={label} items={items} value={value} onChange={onChange} wrap />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
