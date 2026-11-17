import { View } from 'react-native';
import { Field, type FieldProps, ErrorLine, Note } from '@ab/mobile-kit';

interface PeopleFieldProps extends FieldProps {
  error?: string | null;
  /** What the field is for, under it (the student's own number: their sign-in). */
  hint?: string | undefined;
}

/** A people edit field: the 44pt Field, its hint, and under it the refusal of the last save. */
export function PeopleField({ error, hint, ...field }: PeopleFieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} />
      {hint ? <Note>{hint}</Note> : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}
