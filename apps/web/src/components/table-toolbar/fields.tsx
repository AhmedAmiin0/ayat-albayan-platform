import { Field } from '../ui/form/field';
import { Input } from '../ui/form/input';
import { Select } from '../ui/form/select';
import type { FilterOption } from '../data-table-features';
import type { FilterChip } from './types';

// Building blocks for a page's own filters in the «تصفية» panel (ExtraFilters): labelled
// fields, and the chip of a set value.

export interface SelectFilterFieldProps {
  label: string;
  value: string | undefined;
  /** The first option is «الكل» (value '' = no filter). */
  options: FilterOption[];
  onChange: (value: string) => void;
}

export function SelectFilterField({ label, value, options, onChange }: SelectFilterFieldProps) {
  return (
    <Field label={label}>
      {(p) => (
        <Select {...p} value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}

export interface DateFilterFieldProps {
  label: string;
  value: string | undefined;
  /** undefined when cleared. */
  onChange: (value: string | undefined) => void;
}

export function DateFilterField({ label, value, onChange }: DateFilterFieldProps) {
  return (
    <Field label={label}>
      {(p) => <Input {...p} type="date" dir="ltr" value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} />}
    </Field>
  );
}

export interface CheckboxFilterFieldProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** A yes / no page filter in the panel: a bordered row, 44px on phones, whose whole label toggles it. */
export function CheckboxFilterField({ label, checked, onChange }: CheckboxFilterFieldProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-md border border-rule px-3 text-sm hover:bg-sunk sm:min-h-10">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-4 shrink-0 accent-[var(--lapis)]"
      />
      <span>{label}</span>
    </label>
  );
}

/** The chip of one page filter when it is set (`text` = what the chip shows); none when unset. */
export function chipIfSet(chip: Omit<FilterChip, 'value'> & { value: string | undefined; text?: string | undefined }): FilterChip[] {
  if (!chip.value) return [];
  return [{ id: chip.id, label: chip.label, value: chip.text ?? chip.value, onRemove: chip.onRemove }];
}
