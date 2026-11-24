import { FILLED_BY, type FilledBy } from '@ab/shared';
import { View } from 'react-native';
import { t, FilterPills, type FilterPill, FormLabel } from '@ab/mobile-kit';
import { CLEAR } from './PreferenceFields';
import type { QualFieldsProps } from './QualificationFields';
import { QualText } from './QualText';

const FILLED_BY_PILLS: FilterPill<FilledBy | ''>[] = [
  CLEAR,
  ...FILLED_BY.map((v) => ({ value: v, label: t.leads.filledByOption[v] })),
];

/** R-LEAD-03: relation stays free text since its options cannot be rebuilt from old answers. */
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
