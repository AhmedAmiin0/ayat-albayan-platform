import { t } from '../../../lib/i18n/i18n';
import { Field } from '../../../ui/form/Field';
import type { CodeFieldProps } from './CodeField.types';

/**
 * The 6-digit WhatsApp code: number pad, the OS's one-time-code autofill, Arabic digits folded
 * later.
 */
export function CodeField({ value, onChange }: CodeFieldProps) {
  return (
    <Field
      label={t.familyAuth.code}
      ltr
      keyboardType="number-pad"
      textContentType="oneTimeCode"
      autoComplete="sms-otp"
      maxLength={12}
      value={value}
      onChangeText={onChange}
    />
  );
}
