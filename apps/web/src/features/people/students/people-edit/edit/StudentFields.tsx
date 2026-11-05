import type { StudentForm } from '@ab/client-core';
import { GENDERS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { TextField } from '@/features/people/students/people-edit/TextField';

const F = t.peopleEdit.fields;
const TEXTS = ['name', 'level', 'memorized', 'goal', 'riwaya', 'notes'] as const;

export interface StudentFieldsProps {
  value: StudentForm;
  onChange: (patch: Partial<StudentForm>) => void;
  /** Keys the last save refused. */
  invalid: readonly string[];
}

/** «بيانات الطالب»: the fields an assistant may edit (never status, program, teacher or link). */
export function StudentFields({ value, onChange, invalid }: StudentFieldsProps) {
  const error = (key: string) => (invalid.includes(key) ? t.peopleEdit.invalid : undefined);
  const gender = (key: 'gender' | 'teacher_gender_pref', label: string, none: string) => (
    <Field label={label}>
      {(p) => (
        <Select {...p} value={value[key]} onChange={(e) => onChange({ [key]: e.target.value })}>
          <option value="">{none}</option>
          {GENDERS.map((g) => (
            <option key={g} value={g}>
              {t.enums.gender[g]}
            </option>
          ))}
        </Select>
      )}
    </Field>
  );
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-semibold">{t.peopleEdit.studentSection}</legend>
      {TEXTS.map((key) => (
        <TextField
          key={key}
          label={F[key]}
          value={value[key]}
          error={error(key)}
          onValue={(v) => onChange({ [key]: v })}
        />
      ))}
      <TextField
        label={F.age}
        value={value.age}
        inputMode="numeric"
        error={error('age')}
        onValue={(age) => onChange({ age })}
      />
      {gender('gender', F.gender, '')}
      {gender('teacher_gender_pref', F.teacherGenderPref, F.noPreference)}
      <Field label={F.tz}>
        {(p) => <TimeZoneSelect {...p} value={value.tz} onValue={(tz) => onChange({ tz })} />}
      </Field>
    </fieldset>
  );
}
