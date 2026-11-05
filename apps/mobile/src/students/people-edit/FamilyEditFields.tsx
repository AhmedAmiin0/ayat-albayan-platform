import type { FamilyForm } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { PeopleChoice } from './PeopleChoice';
import { PeopleFields, type FieldSpec } from './PeopleFields';
import { zoneItems } from './zone-items';

const E = t.peopleEdit;
type Spec = FieldSpec<'name' | 'phone_e164' | 'country' | 'notes'>;
const BASE: Spec[] = [
  { key: 'name', label: E.fields.name },
  { key: 'phone_e164', label: E.fields.phone, phone: true },
  { key: 'country', label: E.fields.country },
];
/** With the notes field (never for sales: hasNotes). */
const WITH_NOTES: Spec[] = [...BASE, { key: 'notes', label: E.fields.notes }];

interface FamilyEditFieldsProps {
  value: FamilyForm;
  onChange: (patch: Partial<FamilyForm>) => void;
  invalid: readonly string[];
  notes: boolean;
}

/** «بيانات العائلة»: the guardian's name, main number (E.164), country, zone and notes. */
export function FamilyEditFields({ value, onChange, invalid, notes }: FamilyEditFieldsProps) {
  const error = (key: string) => (invalid.includes(key) ? E.invalid : null);
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{E.familySection}</SectionLabel>
      <PeopleFields
        specs={notes ? WITH_NOTES : BASE}
        value={value}
        error={error}
        onChange={onChange}
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
