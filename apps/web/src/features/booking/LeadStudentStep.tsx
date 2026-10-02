import { PROGRAMS, type Program } from '@ab/shared';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PhonePreview } from '@/components/ui/phone-preview';
import { Select } from '@/components/ui/select';
import { TimeZoneSelect } from '@/components/ui/time-zone-select';
import { phoneError } from '@/features/students/create-student';
import { t } from '@/lib/i18n';
import type { NewStudentDraft } from './draft';

export interface LeadStudentStepProps {
  value: NewStudentDraft;
  tz: string;
  program: Program;
  onChange: (patch: { newStudent?: NewStudentDraft; tz?: string; program?: Program }) => void;
}

/**
 * Step 1 from a lead (R-LEAD-06): the new student and the guardian, phone prefilled from the
 * WhatsApp number. The zone applies to both and becomes the rule's zone.
 */
export function LeadStudentStep({ value, tz, program, onChange }: LeadStudentStepProps) {
  const set = (patch: Partial<NewStudentDraft>) => onChange({ newStudent: { ...value, ...patch } });
  const phoneProblem = value.guardianPhone.trim() ? phoneError(value.guardianPhone) : undefined;

  return (
    <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
      <h3 className="text-sm font-semibold sm:col-span-2">{t.booking.fromLead}</h3>
      <Field label={t.students.name}>
        {(p) => <Input {...p} value={value.name} data-autofocus onChange={(e) => set({ name: e.target.value })} />}
      </Field>
      <Field label={t.students.program}>
        {(p) => (
          <Select
            {...p}
            value={program}
            onChange={(e) => onChange({ program: PROGRAMS.find((x) => x === e.target.value) ?? program })}
          >
            {PROGRAMS.map((x) => (
              <option key={x} value={x}>
                {t.enums.program[x]}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={t.guardians.name}>
        {(p) => <Input {...p} value={value.guardianName} onChange={(e) => set({ guardianName: e.target.value })} />}
      </Field>
      <Field label={t.guardians.phone} error={phoneProblem}>
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
      <Field label={t.students.tz}>
        {(p) => <TimeZoneSelect {...p} value={tz} onValue={(next) => onChange({ tz: next })} />}
      </Field>
    </div>
  );
}
