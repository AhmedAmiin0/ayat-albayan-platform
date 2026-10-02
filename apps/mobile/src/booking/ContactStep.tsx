import { TZ_OPTIONS } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { FilterPills } from '@/ui/FilterPills';
import { contactReady, phoneProblem, type TrialDraft } from './draft';
import { cityOf } from './slots';

type Contact = Pick<TrialDraft, 'studentName' | 'guardianName' | 'phone' | 'tz'>;

export interface ContactStepProps {
  value: Contact;
  onChange: (patch: Partial<Contact>) => void;
  onNext: () => void;
}

const TZ_PILLS = TZ_OPTIONS.map((tz): { value: string; label: string } => ({
  value: tz,
  label: cityOf(tz),
}));

/**
 * Step 1 «الطالب» (R-LEAD-06): the child's name, the parent's name and WhatsApp number (prefilled
 * from the lead, checked by normalizePhone, rule 7) and the family's zone, picked, never typed.
 */
export function ContactStep({ value, onChange, onNext }: ContactStepProps) {
  const [tried, setTried] = useState(false);
  const phone = phoneProblem(value.phone);
  const next = () => {
    setTried(true);
    if (contactReady(value)) onNext();
  };
  const required = (text: string) =>
    tried && !text.trim() ? <ErrorLine message={t.common.required} /> : null;

  return (
    <View style={{ gap: 14 }}>
      <FormLabel>{t.booking.fromLead}</FormLabel>
      <Field
        label={t.students.name}
        value={value.studentName}
        onChangeText={(studentName) => onChange({ studentName })}
      />
      {required(value.studentName)}
      <Field
        label={t.guardians.name}
        value={value.guardianName}
        onChangeText={(guardianName) => onChange({ guardianName })}
      />
      {required(value.guardianName)}
      <Field
        label={t.guardians.phone}
        ltr
        keyboardType="phone-pad"
        value={value.phone}
        onChangeText={(text) => onChange({ phone: text })}
      />
      {(tried || value.phone.trim()) && phone ? (
        <ErrorLine message={t.common.phoneErrors[phone]} />
      ) : null}
      <View style={{ gap: 6 }}>
        <FormLabel>{t.students.tz}</FormLabel>
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.students.tz}
          items={TZ_PILLS}
          value={value.tz}
          onChange={(tz) => onChange({ tz })}
        />
      </View>
      <Button label={t.booking.next} onPress={next} />
    </View>
  );
}
