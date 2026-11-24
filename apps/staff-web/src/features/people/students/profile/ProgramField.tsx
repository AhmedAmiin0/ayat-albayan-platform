import { PROGRAMS, type Program } from '@ab/catalog';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { t } from '@ab/web-kit/lib/i18n/i18n';

export interface ProgramFieldProps {
  value: Program;
  onChange: (value: Program) => void;
}

/** R-STU-01: quran by default. */
export function ProgramField({ value, onChange }: ProgramFieldProps) {
  return (
    <Field label={t.students.program}>
      {(p) => (
        <Select {...p} value={value} onChange={(e) => onChange(e.target.value as Program)}>
          {PROGRAMS.map((v) => (
            <option key={v} value={v}>
              {t.enums.program[v]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
}
