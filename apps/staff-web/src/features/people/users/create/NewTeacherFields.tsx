import { Field, Input, Select, t } from '@ab/web-kit';
import type { NewTeacherForm } from './create-form';

const N = t.users.newTeacher;

export interface NewTeacherFieldsProps {
  value: NewTeacherForm;
  onChange: (next: NewTeacherForm) => void;
  error?: string | undefined;
}

export function NewTeacherFields({ value, onChange, error }: NewTeacherFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={N.nameAr} required error={error}>
        {(p) => (
          <Input
            {...p}
            value={value.display_name_ar}
            onChange={(e) => onChange({ ...value, display_name_ar: e.target.value })}
          />
        )}
      </Field>
      <Field label={N.nameEn}>
        {(p) => <Input {...p} dir="ltr" value={value.display_name_en} onChange={(e) => onChange({ ...value, display_name_en: e.target.value })} />}
      </Field>
      <Field label={N.gender}>
        {(p) => (
          <Select {...p} value={value.gender} onChange={(e) => onChange({ ...value, gender: e.target.value === 'male' ? 'male' : 'female' })}>
            <option value="female">{N.female}</option>
            <option value="male">{N.male}</option>
          </Select>
        )}
      </Field>
    </div>
  );
}
