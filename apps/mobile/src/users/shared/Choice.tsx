import { View } from 'react-native';
import { FormLabel } from '@/payments/FormLabel';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';

export interface ChoiceProps<V extends string> {
  label: string;
  items: readonly FilterPill<V>[];
  value: V;
  onChange: (value: V) => void;
}

/** A labelled single choice (the web's <Select> / radio chips): every option in view, as radios. */
export function Choice<V extends string>({ label, items, value, onChange }: ChoiceProps<V>) {
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <FilterPills items={items} value={value} onChange={onChange} accessibilityLabel={label} role="radiogroup" wrap />
    </View>
  );
}
