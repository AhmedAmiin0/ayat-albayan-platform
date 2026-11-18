import { t } from '@ab/mobile-kit';
import { FormField } from './FormField';

interface MaxUsersFieldProps {
  /** Digits as typed; empty = «بلا حد». */
  value: string;
  onChange: (maxUsers: string) => void;
  error?: string | undefined;
}

/** «عدد المستخدمين المسموح به»: distinct people who may open the link; empty is «بلا حد». */
export function MaxUsersField({ value, onChange, error }: MaxUsersFieldProps) {
  const F = t.shortLinks.form;
  return (
    <FormField
      label={F.maxUsers}
      keyboardType="number-pad"
      placeholder={F.unlimited}
      value={value}
      onChangeText={onChange}
      hint={F.maxUsersHint}
      error={error}
    />
  );
}
