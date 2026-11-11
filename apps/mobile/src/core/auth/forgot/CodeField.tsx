import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';

/**
 * The 6-digit WhatsApp code: number pad, the OS's one-time-code autofill, Arabic digits folded
 * later.
 */
export function CodeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
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
