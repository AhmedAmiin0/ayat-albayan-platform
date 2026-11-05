import { View } from 'react-native';
import { ErrorLine } from '@/core/ui/feedback/ErrorLine';
import { Field, type FieldProps } from '@/core/ui/form/Field';

/** A people edit field: the 44pt Field, and under it the refusal of the last save. */
export function PeopleField({ error, ...field }: FieldProps & { error?: string | null }) {
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
