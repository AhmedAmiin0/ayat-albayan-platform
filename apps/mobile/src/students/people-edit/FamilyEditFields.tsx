import type { FamilyForm } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { PeopleChoice } from './PeopleChoice';
import { PeopleField } from './PeopleField';
import { zoneItems } from './zone-items';

const E = t.peopleEdit;

interface FamilyEditFieldsProps {
  value: FamilyForm;
  onChange: (patch: Partial<FamilyForm>) => void;
  invalid: readonly string[];
}

/** «بيانات العائلة»: the guardian's name, main number (E.164), country, zone and notes. */
export function FamilyEditFields({ value, onChange, invalid }: FamilyEditFieldsProps) {
  const error = (key: string) => (invalid.includes(key) ? E.invalid : null);
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{E.familySection}</SectionLabel>
      <PeopleField label={E.fields.name} value={value.name} error={error('name')} onChangeText={(name) => onChange({ name })} />
      <PeopleField
        label={E.fields.phone}
        value={value.phone_e164}
        ltr
        keyboardType="phone-pad"
        error={error('phone_e164')}
        onChangeText={(phone_e164) => onChange({ phone_e164 })}
      />
      <PeopleField label={E.fields.country} value={value.country} error={error('country')} onChangeText={(country) => onChange({ country })} />
      <PeopleField label={E.fields.notes} value={value.notes} error={error('notes')} onChangeText={(notes) => onChange({ notes })} />
      <PeopleChoice label={E.fields.tz} items={zoneItems(value.tz)} value={value.tz} onChange={(tz) => onChange({ tz })} />
    </View>
  );
}
