import type { FieldProps } from '../../ui/form/Field';

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
