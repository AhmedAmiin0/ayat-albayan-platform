import { PROGRAMS, type Program } from '@ab/catalog';
import { Field, Select, t } from '@ab/web-kit';

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
