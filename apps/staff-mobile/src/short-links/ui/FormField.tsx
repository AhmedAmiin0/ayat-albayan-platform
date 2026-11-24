import { View } from 'react-native';
import { ErrorLine, Field, Note, type FieldProps } from '@ab/mobile-kit';

interface FormFieldProps extends FieldProps {
  hint?: string | undefined;
  /** The field's error words, shown in place of nothing. */
  error?: string | undefined;
}

/** A labelled input with its hint and its validation line. */
export function FormField({ hint, error, ...field }: FormFieldProps) {
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} />
      {error ? <ErrorLine message={error} /> : null}
      {hint ? <Note>{hint}</Note> : null}
    </View>
  );
}
