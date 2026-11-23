import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface TopicFieldProps {
  label: string;
  value: string | null;
  onChange: (value: string) => void;
  /** The send found it missing (missing_topic) while it is still blank. */
  invalid?: boolean;
  required?: boolean;
}

/** 300 characters at most. */
export function TopicField({ label, value, onChange, invalid, required }: TopicFieldProps) {
  const blank = !value?.trim();
  return (
    <Field label={label} required={required} error={invalid && blank ? t.common.required : undefined}>
      {(control) => <Input {...control} maxLength={300} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </Field>
  );
}
