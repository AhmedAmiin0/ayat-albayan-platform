import { PROGRAMS, type Program } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n';

export interface ProgramFieldProps {
  value: Program;
  onChange: (value: Program) => void;
}

/** «البرنامج» of a new student (R-STU-01); quran by default. */
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
