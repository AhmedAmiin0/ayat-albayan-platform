import { notesFilter, type StudentForm } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { PeopleChoice } from './PeopleChoice';
import { type FieldSpec, PeopleFields } from './PeopleFields';
import { genderItems, zoneItems } from './zone-items';

const E = t.peopleEdit;
const TEXTS = ['name', 'level', 'memorized', 'goal', 'riwaya', 'notes'] as const;
/** The text fields; the student's own WhatsApp (sign-in) is optional. */
const SPECS: FieldSpec<(typeof TEXTS)[number] | 'phone_e164' | 'age'>[] = [
  ...TEXTS.map((key) => ({ key, label: E.fields[key] })),
  { key: 'phone_e164', label: E.fields.studentPhone, phone: true, hint: E.studentPhoneHint },
  { key: 'age', label: E.fields.age, keyboardType: 'number-pad' },
];

interface StudentEditFieldsProps {
  value: StudentForm;
  onChange: (patch: Partial<StudentForm>) => void;
  /** Keys the last save refused. */
  invalid: readonly string[];
  /** Notes are the admin's only. */
  notes: boolean;
}

/** An assistant may never edit status, program, teacher or link. */
export function StudentEditFields(props: StudentEditFieldsProps) {
  const { value, onChange, invalid, notes } = props;
  const error = (key: string) => (invalid.includes(key) ? E.invalid : null);
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{E.studentSection}</SectionLabel>
      <PeopleFields
        specs={SPECS.filter((s) => notesFilter(notes)(s.key))}
        value={value}
        error={error}
        onChange={onChange}
      />
      <PeopleChoice
        label={E.fields.gender}
        items={genderItems(E.fields.noPreference)}
        value={value.gender}
        onChange={(gender) => onChange({ gender })}
      />
      <PeopleChoice
        label={E.fields.teacherGenderPref}
        items={genderItems(E.fields.noPreference)}
        value={value.teacher_gender_pref}
        onChange={(teacher_gender_pref) => onChange({ teacher_gender_pref })}
      />
      <PeopleChoice
        label={E.fields.tz}
        items={zoneItems(value.tz)}
        value={value.tz}
        onChange={(tz) => onChange({ tz })}
      />
    </View>
  );
}
