import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Field, type FieldProps } from '@/core/ui/form/Field';

export interface AccountFieldProps extends FieldProps {
  /** The field's own message (account.errors.*), announced as an alert under it. */
  error?: string;
  /** A short line under the input (format, length). */
  hint?: string;
}

/** ui/Field plus its hint and its field-level error (docs/07 §10: 13pt+ cinnabar under the field). */
export function AccountField({ error, hint, ...field }: AccountFieldProps) {
  const { color } = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <Field {...field} accessibilityHint={error ?? hint} />
      {hint ? (
        <AppText
          style={{
            fontFamily: type.ui[400],
            fontSize: type.size.xs,
            lineHeight: type.lineHeight(type.size.xs),
            color: color.ink3,
          }}
        >
          {hint}
        </AppText>
      ) : null}
      {error ? <ErrorLine message={error} /> : null}
    </View>
  );
}

/** The current-password input every sensitive change asks for (R-ACC-02..04). */
export function passwordInput(label: string): Partial<FieldProps> & { label: string } {
  return {
    label,
    secureTextEntry: true,
    autoCapitalize: 'none',
    autoCorrect: false,
    autoComplete: 'current-password',
    textContentType: 'password',
    ltr: true,
  };
}
