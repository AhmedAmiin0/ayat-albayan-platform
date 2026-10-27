import type { Gender, LeadSource } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/core/ui/primitives/Button';
import { Field } from '@/core/ui/form/Field';
import { FilterPills } from '@/core/ui/form/FilterPills';
import { GENDER_PILLS, sourcePills, TZ_PILLS } from '../lib/contact-pills';
import { ageValid, contactReady, phoneProblem, type TrialDraft } from '../lib/draft';
import { DurationPills } from './DurationPills';
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
  /** The trial asks «المده» here; a package asks it on its own step. */
  withDuration: boolean;
  onChange: (patch: Partial<Contact>) => void;
  onNext: () => void;
}

/**
 * Step 1 «الطالب» (R-LEAD-06), the registration form's questions in its order and words: «اسم
 * الطالب», «رقم الواتساب (مع كود الدولة) *» with the form's help (prefilled from the lead, checked
 * by normalizePhone, rule 7), the parent's name, «سن الطالب», «النوع», «المده» for a trial and
 * «عرفت عننا منين؟» (prefilled from the lead). The family's zone stays a pick, never typed: the
 * slot clock and the rule's zone depend on it. Required ones carry «*».
 */
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
        <ContactIsSelfPills value={value.contactIsSelf === true} onChange={(contactIsSelf) => onChange({ contactIsSelf })} />,
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
