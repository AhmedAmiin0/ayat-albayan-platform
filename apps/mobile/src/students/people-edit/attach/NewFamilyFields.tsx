import type { NewFamilyForm } from '@ab/client-core';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Button } from '@/core/ui/primitives/Button';
import { SectionLabel } from '@/core/ui/surface/SectionLabel';
import { Note } from '@/more';
import { PeopleChoice } from '@/students/people-edit/PeopleChoice';
import { PeopleFields, type FieldSpec } from '@/students/people-edit/PeopleFields';
import { zoneItems } from '@/students/people-edit/zone-items';

const E = t.peopleEdit;
const SPECS: FieldSpec<'name' | 'phone_e164'>[] = [
  { key: 'name', label: E.fields.name },
  { key: 'phone_e164', label: E.fields.phone, phone: true },
];

interface NewFamilyFieldsProps {
  value: NewFamilyForm;
  /** The refusal of a field, or null. */
  error: (key: string) => string | null;
  onChange: (patch: Partial<NewFamilyForm>) => void;
  /** Takes this guardian as the move's family (found by the number first on save). */
  onUse: () => void;
}

/** «ولي أمر جديد»: name, WhatsApp number (E.164) and zone. */
export function NewFamilyFields({ value, error, onChange, onUse }: NewFamilyFieldsProps) {
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{E.newFamily}</SectionLabel>
      <Note>{E.newFamilyHint}</Note>
      <PeopleFields specs={SPECS} value={value} error={error} onChange={onChange} />
      <PeopleChoice
        label={E.fields.tz}
        items={zoneItems(value.tz)}
        value={value.tz}
        onChange={(tz) => onChange({ tz })}
      />
      <Button variant="secondary" label={E.newFamily} onPress={onUse} />
    </View>
  );
}
