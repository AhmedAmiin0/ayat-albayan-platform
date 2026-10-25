import { Input } from '@/components/ui/form/input';
import { SettingRow, type RowExtras } from './SettingRow';

export interface NumberFieldProps extends RowExtras {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  /** A list of numbers («24، 72») instead of one. */
  list?: boolean;
  disabled?: boolean;
}

/** A count (hours, weeks, lessons, minutes): LTR digits, never a time of day (rule 6). */
export function NumberField({ label, value, onChange, hint, error, list, disabled, ...row }: NumberFieldProps) {
  return (
    <SettingRow label={label} hint={hint} error={error} {...row}>
      {(p) => (
        <Input
          {...p}
          type={list ? 'text' : 'number'}
          inputMode="numeric"
          dir="ltr"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-[140px] tabular-nums"
        />
      )}
    </SettingRow>
  );
}
