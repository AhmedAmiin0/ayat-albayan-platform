import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { RequiredLegend } from '@/components/ui/form/label';
import { PhonePreview } from '@/components/ui/form/phone-preview';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { SourceField } from '@/features/guardians/SourceField';
import { ageError, phoneError } from '@/features/students/create-student';
import { AgeField, GenderField } from '@/features/students/FactFields';
import { t } from '@/lib/i18n';
import type { NewStudentDraft } from './draft';

export interface LeadStudentStepProps {
  value: NewStudentDraft;
  tz: string;
  onChange: (patch: { newStudent?: NewStudentDraft; tz?: string }) => void;
  /** The heading; «طالب جديد من المحادثة» unless there is no chat behind it (an assistant's registration). */
  title?: string | undefined;
}

/**
 * Step 1 from a lead (R-LEAD-06): the registration form's questions in its order and wording
 * («اسم الطالب», «رقم الواتساب (مع كود الدولة)», «سن الطالب», «النوع», «عرفت عننا منين؟»),
 * prefilled from the WhatsApp number and the lead's «بيانات الطالب». The guardian's name (stored on
 * the guardian) and the zone (every person has one, rule 6) follow. The program is picked with the
 * teacher in step 2. The zone applies to both and becomes the rule's zone.
 */
export function LeadStudentStep({ value, tz, onChange, title }: LeadStudentStepProps) {
  const set = (patch: Partial<NewStudentDraft>) => onChange({ newStudent: { ...value, ...patch } });
  const phoneProblem = value.guardianPhone.trim() ? phoneError(value.guardianPhone) : undefined;
  const age = value.age ?? '';

  return (
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      <h3 className="text-sm font-semibold sm:col-span-2">{title ?? t.booking.fromLead}</h3>
      <div className="sm:col-span-2">
        <RequiredLegend />
      </div>
      <Field label={t.leads.studentName} required>
        {(p) => <Input {...p} value={value.name} data-autofocus onChange={(e) => set({ name: e.target.value })} />}
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
      <AgeField value={age} error={age.trim() ? ageError(age) : undefined} onChange={(next) => set({ age: next })} />
      <GenderField value={value.gender ?? ''} onChange={(gender) => set({ gender })} />
      <SourceField value={value.source ?? ''} onChange={(source) => set({ source })} />
      <Field label={t.guardians.name} required>
        {(p) => <Input {...p} value={value.guardianName} onChange={(e) => set({ guardianName: e.target.value })} />}
      </Field>
      <Field label={t.students.tz}>
        {(p) => <TimeZoneSelect {...p} value={tz} onValue={(next) => onChange({ tz: next })} />}
      </Field>
    </div>
  );
}
