import { View } from 'react-native';
import { Field, type FieldProps, ErrorLine } from '@ab/mobile-kit';

/** A people edit field: the 44pt Field, and under it the refusal of the last save. */
export function PeopleField({ error, ...field }: FieldProps & { error?: string | null }) {
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} />
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
