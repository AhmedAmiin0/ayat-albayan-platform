import { Field, Input, RequiredLegend, PhonePreview, TimeZoneSelect, t } from '@ab/web-kit';
import { SourceField } from '@/features/people/guardians/SourceField';
import { ageError, phoneError } from '@/features/people/students/create/create-student';
import { AgeField, GenderField } from '@/features/people/students/profile/FactFields';
import { ContactIsSelfField } from '@/features/people/students';
import type { NewStudentDraft } from '@/features/teaching/booking/draft/draft';

export interface LeadStudentStepProps {
  value: NewStudentDraft;
  tz: string;
  onChange: (patch: { newStudent?: NewStudentDraft; tz?: string }) => void;
  /** The default heading assumes a chat; an assistant's registration has none. */
  title?: string | undefined;
}

/** Lead path (R-LEAD-06); every person has a zone (rule 6), which becomes the rule's zone. */
export function LeadStudentStep({ value, tz, onChange, title }: LeadStudentStepProps) {
  const set = (patch: Partial<NewStudentDraft>) => onChange({ newStudent: { ...value, ...patch } });
  const phoneProblem = value.guardianPhone.trim() ? phoneError(value.guardianPhone) : undefined;
  const age = value.age ?? '';
  const ageProblem = age.trim() ? ageError(age) : undefined;
  const onName = (e: { target: { value: string } }) => set({ name: e.target.value });
  const onGuardian = (e: { target: { value: string } }) => set({ guardianName: e.target.value });

  return (
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      <h3 className="text-sm font-semibold sm:col-span-2">{title ?? t.booking.fromLead}</h3>
      <div className="sm:col-span-2">
        <RequiredLegend />
      </div>
      <Field label={t.leads.studentName} required>
        {(p) => <Input {...p} value={value.name} data-autofocus onChange={onName} />}
      </Field>
      <Field label={t.guardians.phone} hint={t.guardians.phoneHint} error={phoneProblem} required>
        {(p) => (
          <>
            <Input
              {...p}
              type="tel"
              dir="ltr"
              value={value.guardianPhone}
              onChange={(e) => set({ guardianPhone: e.target.value })}
            />
            <PhonePreview value={value.guardianPhone} />
          </>
        )}
      </Field>
      <ContactIsSelfField name="lead-contact-is-self" value={value.contactIsSelf === true}
        onChange={(contactIsSelf) => set({ contactIsSelf })} />
      <AgeField value={age} error={ageProblem} onChange={(next) => set({ age: next })} />
      <GenderField value={value.gender ?? ''} onChange={(gender) => set({ gender })} />
      <SourceField value={value.source ?? ''} onChange={(source) => set({ source })} />
      <Field label={t.guardians.name} required>
        {(p) => <Input {...p} value={value.guardianName} onChange={onGuardian} />}
      </Field>
      <Field label={t.students.tz}>
        {(p) => <TimeZoneSelect {...p} value={tz} onValue={(next) => onChange({ tz: next })} />}
      </Field>
    </div>
  );
}
