import type { KeyboardTypeOptions } from 'react-native';
import { PeopleField } from './PeopleField';

/** One text field of a people form: its key, label and keyboard. */
export interface FieldSpec<K extends string> {
  key: K;
  label: string;
  /** A phone: an LTR island with the phone pad. */
  phone?: boolean;
  keyboardType?: KeyboardTypeOptions;
}

interface PeopleFieldsProps<K extends string> {
  specs: readonly FieldSpec<K>[];
  value: Record<K, string>;
  /** The refusal of a field, or null. */
  error: (key: K) => string | null;
  onChange: (patch: Partial<Record<K, string>>) => void;
}

/** The text fields of a people form, from their specs (one 44pt field and its error each). */
export function PeopleFields<K extends string>({
  specs,
  value,
  error,
  onChange,
}: PeopleFieldsProps<K>) {
  return specs.map((s) => (
    <PeopleField
      key={s.key}
      label={s.label}
      value={value[s.key]}
      ltr={s.phone === true}
      keyboardType={s.phone ? 'phone-pad' : s.keyboardType}
      error={error(s.key)}
      onChangeText={(v) => onChange({ [s.key]: v } as Partial<Record<K, string>>)}
    />
  ));
}
