import { GENDERS, type Gender } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n';

// «سن الطالب» and «النوع» as the registration form asks them (research-forms item 1): both
// optional; the age is a whole number 3–99 (ageError has the form's message).

export interface AgeFieldProps {
  value: string;
  error?: string | undefined;
  onChange: (value: string) => void;
}

export function AgeField({ value, error, onChange }: AgeFieldProps) {
  return (
    <Field label={t.students.age} hint={t.students.ageHint} error={error}>
      {(p) => (
        <Input
          {...p}
          type="number"
          inputMode="numeric"
          min={3}
          max={99}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function GenderField({ value, onChange }: { value: Gender | ''; onChange: (value: Gender | '') => void }) {
  return (
    <Field label={t.students.gender}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(GENDERS.find((g) => g === e.target.value) ?? '')}>
          <option value="">—</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {t.enums.gender[g]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
