import { notesFilter, type StudentForm } from '@ab/client-core';
import { GENDERS } from '@ab/catalog';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { TimeZoneSelect } from '@ab/web-kit/components/ui/form/time-zone-select';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { TextField } from '@/features/people/students/people-edit/TextField';
import { StudentPhoneField } from './StudentPhoneField';

const F = t.peopleEdit.fields;
const TEXTS = ['name', 'level', 'memorized', 'goal', 'riwaya', 'notes'] as const;

export interface StudentFieldsProps {
  value: StudentForm;
  onChange: (patch: Partial<StudentForm>) => void;
  /** Keys the last save refused. */
  invalid: readonly string[];
  /** Notes are the admin's only (owner 2026-10-27). */
  notes: boolean;
}

/** An assistant may never edit status, program, teacher or link. */
export function StudentFields({ value, onChange, invalid, notes }: StudentFieldsProps) {
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
      {TEXTS.filter(notesFilter(notes)).map((key) => (
        <TextField
          key={key}
          label={F[key]}
          value={value[key]}
          error={error(key)}
          onValue={(v) => onChange({ [key]: v })}
        />
      ))}
      <StudentPhoneField
        value={value.phone_e164}
        error={error('phone_e164')}
        onValue={(phone_e164) => onChange({ phone_e164 })}
      />
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
