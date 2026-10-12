import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { Field, type FieldProps } from '@/ui/Field';

export interface TextFieldProps extends FieldProps {
  /** The validation message under the input (the web's Field `error`). */
  error?: string | undefined;
}

/** ui/Field with its validation line under it. */
export function TextField({ error, ...field }: TextFieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
