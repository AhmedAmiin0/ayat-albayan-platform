import { View } from 'react-native';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { FormLabel } from '@/core/ui/form/FormLabel';

interface PeopleChoiceProps<V extends string> {
  label: string;
  items: readonly FilterPill<V>[];
  value: V;
  onChange: (value: V) => void;
}

/** A labelled single choice (gender, zone): every option in view, as radios. */
export function PeopleChoice<V extends string>({ label, items, value, onChange }: PeopleChoiceProps<V>) {
  return (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      <FilterPills items={items} value={value} onChange={onChange} accessibilityLabel={label} role="radiogroup" wrap />
    </View>
  );
}
