import type { Gender, LeadSource } from '@ab/catalog';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t, Button, Field, FilterPills, ErrorLine, FormLabel } from '@ab/mobile-kit';
import { Note } from '@/core/ui/feedback/Note';
import { GENDER_PILLS, sourcePills, TZ_PILLS } from '@/booking/trial/lib/contact-pills';
import { ageValid, contactReady, phoneProblem, type TrialDraft } from '@/booking/trial/lib/draft';
import { DurationPills } from '@/booking/trial/components/DurationPills';
import { ContactIsSelfPills } from '@/student-file';

type Contact = Pick<
  TrialDraft,
  | 'studentName'
  | 'age'
  | 'studentGender'
  | 'guardianName'
  | 'phone'
  | 'tz'
  | 'source'
  | 'contactIsSelf'
  | 'durationMin'
>;

interface ContactStepProps {
  value: Contact;
  /** A trial asks the duration here; a package asks it on its own step. */
  withDuration: boolean;
  onChange: (patch: Partial<Contact>) => void;
  onNext: () => void;
}

/** R-LEAD-06: phone checked by normalizePhone (rule 7); the zone is picked, never typed. */
export function ContactStep({ value, withDuration, onChange, onNext }: ContactStepProps) {
  const [tried, setTried] = useState(false);
  const phone = phoneProblem(value.phone);
  const next = () => {
    setTried(true);
    if (contactReady(value)) onNext();
  };
  const required = (text: string) =>
    tried && !text.trim() ? <ErrorLine message={t.common.required} /> : null;
  const group = (label: string, pills: ReactNode) => (
    <View style={{ gap: 6 }}>
      <FormLabel>{label}</FormLabel>
      {pills}
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      <FormLabel>{t.booking.fromLead}</FormLabel>
      <Field
        label={t.leads.studentName}
        required
        value={value.studentName}
        onChangeText={(studentName) => onChange({ studentName })}
      />
      {required(value.studentName)}
      <Field
        label={t.guardians.phone}
        required
        accessibilityHint={t.guardians.phoneHint}
        ltr
        keyboardType="phone-pad"
        value={value.phone}
        onChangeText={(text) => onChange({ phone: text })}
      />
      <Note>{t.guardians.phoneHint}</Note>
      {(tried || value.phone.trim()) && phone ? (
        <ErrorLine message={t.common.phoneErrors[phone]} />
      ) : null}
      {group(
        t.familyAuth.contactIsSelf.label,
        <ContactIsSelfPills
          value={value.contactIsSelf === true}
          onChange={(contactIsSelf) => onChange({ contactIsSelf })}
        />,
      )}
      <Note>{t.familyAuth.contactIsSelf.hint}</Note>
      <Field
        label={t.guardians.name}
        required
        value={value.guardianName}
        onChangeText={(guardianName) => onChange({ guardianName })}
      />
      {required(value.guardianName)}
      <Field
        label={t.leads.studentAge}
        ltr
        keyboardType="number-pad"
        maxLength={2}
        value={value.age}
        onChangeText={(age) => onChange({ age })}
      />
      {ageValid(value.age) ? null : <ErrorLine message={t.students.ageInvalid} />}
      {group(
        t.students.gender,
        <FilterPills<Gender | ''>
          role="radiogroup"
          wrap
          accessibilityLabel={t.students.gender}
          items={GENDER_PILLS}
          value={value.studentGender ?? ''}
          onChange={(g) => onChange({ studentGender: g || null })}
        />,
      )}
      {group(
        t.students.tz,
        <FilterPills
          role="radiogroup"
          wrap
          accessibilityLabel={t.students.tz}
          items={TZ_PILLS}
          value={value.tz}
          onChange={(tz) => onChange({ tz })}
        />,
      )}
      {withDuration ? (
        <DurationPills
          value={value.durationMin}
          onChange={(durationMin) => onChange({ durationMin })}
        />
      ) : null}
      {group(
        t.guardians.source,
        <FilterPills<LeadSource | ''>
          role="radiogroup"
          wrap
          accessibilityLabel={t.guardians.source}
          items={sourcePills(value.source)}
          value={value.source ?? ''}
          onChange={(s) => onChange({ source: s || null })}
        />,
      )}
      <Button label={t.booking.next} onPress={next} />
    </View>
  );
}
