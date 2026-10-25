import { GENDERS, type Gender } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { Field } from '@/core/ui/form/Field';
import { FilterPills, type FilterPill } from '@/core/ui/form/FilterPills';
import { ErrorLine } from '../ErrorLine';
import { FamilyFields } from './FamilyFields';
import { CLEAR } from './PreferenceFields';
import type { QualErrors, QualForm, TextField } from './qualification-form';
import { QualText } from './QualText';

export interface QualFieldsProps {
  form: QualForm;
  errors: QualErrors;
  onChange: (patch: Partial<QualForm>) => void;
}

const GENDER_PILLS: FilterPill<Gender | ''>[] = [
  CLEAR,
  ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] })),
];

const STUDY: { key: TextField; label: string }[] = [
  { key: 'level', label: t.leads.level },
  { key: 'memorized', label: t.leads.memorized },
  { key: 'goal', label: t.leads.goal },
  { key: 'riwaya', label: t.leads.riwaya },
];

/**
 * Who the student is (R-LEAD-03), in the registration form's order and wording: name, age, gender,
 * country, then the family questions, then level, memorized, goal, riwaya.
 */
export function QualificationFields(props: QualFieldsProps) {
  const { form, errors, onChange } = props;
  return (
    <View style={{ gap: 14 }}>
      <QualText {...props} field="student_name" label={t.leads.studentName} />
      <View style={{ gap: 4 }}>
        <Field
          label={t.leads.studentAge}
          ltr
          keyboardType="number-pad"
          maxLength={2}
          value={form.age}
          onChangeText={(age) => onChange({ age })}
        />
        {errors.age ? <ErrorLine message={errors.age} /> : null}
      </View>
      <View style={{ gap: 6 }}>
        <FormLabel>{t.leads.gender}</FormLabel>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.leads.gender}
          items={GENDER_PILLS}
          value={form.gender}
          onChange={(gender) => onChange({ gender })}
        />
      </View>
      <QualText {...props} field="country" label={t.leads.country} />
      <FamilyFields {...props} />
      {STUDY.map(({ key, label }) => (
        <QualText key={key} {...props} field={key} label={label} />
      ))}
    </View>
  );
}
