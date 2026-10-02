import { View } from 'react-native';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { CLEAR } from './PreferenceFields';
import { FILLED_BY, type FilledBy } from './qualification-schema';
import type { QualFieldsProps } from './QualificationFields';
import { QualText } from './QualText';

const FILLED_BY_PILLS: FilterPill<FilledBy | ''>[] = [
  CLEAR,
  ...FILLED_BY.map((v) => ({ value: v, label: t.leads.filledByOption[v] })),
];

/**
 * The registration form's family questions, after «الدولة» as it asked them (R-LEAD-03, the
 * deleted v1 questions): المدينة، بتملا الاستمارة بصفتك، اسم ولي الأمر، صلة القرابة، رقم تواصل بديل.
 * Relation stays free text: its options can't be rebuilt from the old answers.
 */
export function FamilyFields(props: QualFieldsProps) {
  return (
    <>
      <QualText {...props} field="city" label={t.leads.city} />
      <View style={{ gap: 6 }}>
        <FormLabel>{t.leads.filledBy}</FormLabel>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.leads.filledBy}
          items={FILLED_BY_PILLS}
          value={props.form.filled_by}
          onChange={(filled_by) => props.onChange({ filled_by })}
        />
      </View>
      <QualText {...props} field="guardian_name" label={t.guardians.name} />
      <QualText {...props} field="guardian_relation" label={t.leads.guardianRelation} />
      <QualText
        {...props}
        field="alt_phone"
        label={t.leads.altPhone}
        ltr
        keyboardType="phone-pad"
      />
    </>
  );
}
