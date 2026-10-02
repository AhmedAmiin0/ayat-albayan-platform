import { GENDERS, LEAD_SOURCES, TZ_OPTIONS, type Gender, type LeadSource } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/lib/i18n';
import { Note } from '@/more/Note';
import { FormLabel } from '@/payments/FormLabel';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { FilterPills, type FilterPill } from '@/ui/FilterPills';
import { ageValid, contactReady, phoneProblem, type TrialDraft } from './draft';
import { DurationPills } from './DurationPills';
import { cityOf } from './slots';

type Contact = Pick<
  TrialDraft,
  | 'studentName'
  | 'age'
  | 'studentGender'
  | 'guardianName'
  | 'phone'
  | 'tz'
  | 'source'
  | 'durationMin'
>;

export interface ContactStepProps {
  value: Contact;
  /** The trial asks «المده» here; a package asks it on its own step. */
  withDuration: boolean;
  onChange: (patch: Partial<Contact>) => void;
  onNext: () => void;
}

const NONE = { value: '', label: '—' } as const;
const TZ_PILLS = TZ_OPTIONS.map((tz) => ({ value: tz as string, label: cityOf(tz) }));
const GENDER_PILLS: FilterPill<Gender | ''>[] = [
  NONE,
  ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] })),
];
const SOURCE_PILLS: FilterPill<LeadSource | ''>[] = [
  NONE,
  ...LEAD_SOURCES.map((s) => ({ value: s, label: t.enums.leadSource[s] })),
];

/**
 * Step 1 «الطالب» (R-LEAD-06), the registration form's questions in its words: «اسم الطالب», «سن
 * الطالب», «النوع», the parent's name, «رقم الواتساب (مع كود الدولة)» with the form's help (prefilled
 * from the lead, checked by normalizePhone, rule 7), the family's zone (picked, never typed),
 * «مدة الحلقة» for a trial, and «عرفت عننا منين؟» (prefilled from the lead's source).
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
        value={value.studentName}
        onChangeText={(studentName) => onChange({ studentName })}
      />
      {required(value.studentName)}
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
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.students.gender}
          items={GENDER_PILLS}
          value={value.studentGender ?? ''}
          onChange={(g) => onChange({ studentGender: g || null })}
        />,
      )}
      <Field
        label={t.guardians.name}
        value={value.guardianName}
        onChangeText={(guardianName) => onChange({ guardianName })}
      />
      {required(value.guardianName)}
      <Field
        label={t.guardians.phone}
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
        t.students.tz,
        <FilterPills
          role="radiogroup"
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
        <FilterPills
          role="radiogroup"
          accessibilityLabel={t.guardians.source}
          items={SOURCE_PILLS}
          value={value.source ?? ''}
          onChange={(s) => onChange({ source: s || null })}
        />,
      )}
      <Button label={t.booking.next} onPress={next} />
    </View>
  );
}
