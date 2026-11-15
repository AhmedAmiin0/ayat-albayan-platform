import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import type { NewTeacherForm } from './create-form';

const N = t.users.newTeacher;

export interface NewTeacherFieldsProps {
  value: NewTeacherForm;
  onChange: (next: NewTeacherForm) => void;
  error?: string | undefined;
}

/** «معلم جديد»: the teacher row the login is created with. */
export function NewTeacherFields({ value, onChange, error }: NewTeacherFieldsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label={N.nameAr} required error={error}>
        {(p) => <Input {...p} value={value.display_name_ar} onChange={(e) => onChange({ ...value, display_name_ar: e.target.value })} />}
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
