import { GENDERS, type Gender } from '@ab/shared';
import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { Field } from '@/ui/Field';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ErrorLine } from '../ErrorLine';
import { CLEAR } from './PreferenceFields';
import type { QualErrors, QualForm, TextField } from './qualification-form';

export interface QualFieldsProps {
  form: QualForm;
  errors: QualErrors;
  onChange: (patch: Partial<QualForm>) => void;
}

const GENDER_PILLS: FilterPill<Gender | ''>[] = [
  CLEAR,
  ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] })),
];

const TEXT: { key: TextField; label: string }[] = [
  { key: 'country', label: t.leads.country },
  { key: 'level', label: t.leads.level },
  { key: 'memorized', label: t.leads.memorized },
  { key: 'goal', label: t.leads.goal },
  { key: 'riwaya', label: t.leads.riwaya },
];

/** Who the student is (R-LEAD-03): name, age, gender, country, level, memorized, goal, riwaya. */
export function QualificationFields({ form, errors, onChange }: QualFieldsProps) {
  const text = (key: TextField, label: string) => {
    const error = errors[key];
    return (
      <View key={key} style={{ gap: 4 }}>
        <Field label={label} value={form[key]} onChangeText={(v) => onChange({ [key]: v })} />
        {error ? <ErrorLine message={error} /> : null}
      </View>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      {text('student_name', t.leads.studentName)}
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
      {TEXT.map(({ key, label }) => text(key, label))}
    </View>
  );
}
