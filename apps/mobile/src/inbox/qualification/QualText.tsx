import { View } from 'react-native';
import { Field, type FieldProps } from '@/core/ui/form/Field';
import { ErrorLine } from '../ErrorLine';
import type { TextField } from './qualification-form';
import type { QualFieldsProps } from './QualificationFields';

export type QualTextProps = QualFieldsProps & {
  field: TextField;
  label: string;
} & Omit<FieldProps, 'label' | 'value' | 'onChangeText'>;

/** One typed qualification answer with its error under it. */
export function QualText({ form, errors, onChange, field, label, ...input }: QualTextProps) {
  const error = errors[field];
  return (
    <View style={{ gap: 4 }}>
      <Field
        label={label}
        value={form[field]}
        onChangeText={(v) => onChange({ [field]: v })}
        {...input}
      />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
