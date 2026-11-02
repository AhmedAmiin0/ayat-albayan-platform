import type { StudentForm } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { PeopleChoice } from './PeopleChoice';
import { PeopleField } from './PeopleField';
import { genderItems, zoneItems } from './zone-items';

const E = t.peopleEdit;
const TEXTS = ['name', 'level', 'memorized', 'goal', 'riwaya', 'notes'] as const;

interface StudentEditFieldsProps {
  value: StudentForm;
  onChange: (patch: Partial<StudentForm>) => void;
  /** Keys the last save refused. */
  invalid: readonly string[];
}

/** «بيانات الطالب»: what an assistant may edit (never status, program, teacher or link). */
export function StudentEditFields({ value, onChange, invalid }: StudentEditFieldsProps) {
  const error = (key: string) => (invalid.includes(key) ? E.invalid : null);
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{E.studentSection}</SectionLabel>
      {TEXTS.map((key) => (
        <PeopleField key={key} label={E.fields[key]} value={value[key]} error={error(key)} onChangeText={(v) => onChange({ [key]: v })} />
      ))}
      <PeopleField label={E.fields.age} value={value.age} keyboardType="number-pad" error={error('age')} onChangeText={(age) => onChange({ age })} />
      <PeopleChoice label={E.fields.gender} items={genderItems(E.fields.noPreference)} value={value.gender} onChange={(gender) => onChange({ gender })} />
      <PeopleChoice
        label={E.fields.teacherGenderPref}
        items={genderItems(E.fields.noPreference)}
        value={value.teacher_gender_pref}
        onChange={(teacher_gender_pref) => onChange({ teacher_gender_pref })}
      />
      <PeopleChoice label={E.fields.tz} items={zoneItems(value.tz)} value={value.tz} onChange={(tz) => onChange({ tz })} />
    </View>
  );
}
