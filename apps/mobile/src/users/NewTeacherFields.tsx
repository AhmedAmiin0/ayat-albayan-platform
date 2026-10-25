import { t } from '@/core/lib/i18n/i18n';
import { Choice } from './Choice';
import type { NewTeacherForm } from './create-form';
import { TextField } from './TextField';

export interface NewTeacherFieldsProps {
  value: NewTeacherForm;
  onChange: (next: NewTeacherForm) => void;
  error?: string | undefined;
}

/** «معلم جديد»: the teacher row the login is created with. */
export function NewTeacherFields({ value, onChange, error }: NewTeacherFieldsProps) {
  const N = t.users.newTeacher;
  const genders = [
    { value: 'female' as const, label: N.female },
    { value: 'male' as const, label: N.male },
  ];
  return (
    <>
      <TextField
        label={N.nameAr}
        required
        error={error}
        value={value.display_name_ar}
        onChangeText={(display_name_ar) => onChange({ ...value, display_name_ar })}
      />
      <TextField
        label={N.nameEn}
        ltr
        value={value.display_name_en}
        onChangeText={(display_name_en) => onChange({ ...value, display_name_en })}
      />
      <Choice label={N.gender} items={genders} value={value.gender} onChange={(gender) => onChange({ ...value, gender })} />
    </>
  );
}
