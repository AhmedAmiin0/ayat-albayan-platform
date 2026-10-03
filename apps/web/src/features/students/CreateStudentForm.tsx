import { PROGRAMS, type Program } from '@ab/shared';
import { useForm } from '@tanstack/react-form';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { RequiredLegend } from '@/components/ui/label';
import { PhonePreview } from '@/components/ui/phone-preview';
import { Select } from '@/components/ui/select';
import { TimeZoneSelect } from '@/components/ui/time-zone-select';
import { SourceField } from '@/features/guardians/SourceField';
import { t } from '@/lib/i18n';
import { ageError, EMPTY_STUDENT, phoneError, requiredError, type CreateStudentValues } from './create-student';
import { AgeField, GenderField } from './FactFields';

type CreateStudentFormProps = {
  onSubmit: (values: CreateStudentValues) => Promise<void>;
  onCancel: () => void;
  error: string | null;
};

// The registration form's wording (research-forms 1, 3, 4, 7): «اسم الطالب», «رقم الواتساب
// (مع كود الدولة)» with its hint, then «سن الطالب», «النوع» and «عرفت عننا منين؟» (optional).
const TEXT_FIELDS = [
  { name: 'name', label: t.leads.studentName, check: requiredError },
  { name: 'guardianName', label: t.guardians.name, check: requiredError },
  { name: 'guardianPhone', label: t.guardians.phone, check: phoneError, dir: 'ltr', type: 'tel', hint: t.guardians.phoneHint },
] as const;

/**
 * «إضافة طالب» dialog: student + guardian phone in one step (R-STU-02, R-STU-04). `noValidate`:
 * errors are the Arabic field errors (docs/07 §10), never the browser's bubble.
 */
export function CreateStudentForm({ onSubmit, onCancel, error }: CreateStudentFormProps) {
  const formId = useId();
  const form = useForm({ defaultValues: EMPTY_STUDENT, onSubmit: ({ value }) => onSubmit(value) });

  const actions = (
    <form.Subscribe selector={(s) => s.isSubmitting}>
      {(submitting) => (
        <>
          <Button type="button" variant="ghost" onClick={onCancel}>{t.common.cancel}</Button>
          <Button type="submit" form={formId} disabled={submitting}>{submitting ? t.common.saving : t.common.save}</Button>
        </>
      )}
    </form.Subscribe>
  );

  return (
    <Dialog title={t.students.add} onClose={onCancel} actions={actions} className="max-w-[640px]">
      <form
        id={formId}
        noValidate
        className="grid gap-x-5 gap-y-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void form.handleSubmit();
        }}
      >
        <div className="sm:col-span-2">
          <RequiredLegend />
        </div>
        {TEXT_FIELDS.map((f) => (
          <form.Field key={f.name} name={f.name} validators={{ onSubmit: ({ value }) => f.check(value) }}>
            {(field) => (
              <Field label={f.label} hint={'hint' in f ? f.hint : undefined} error={field.state.meta.errors[0]} required>
                {(p) => (
                  <>
                    <Input {...p} required value={field.state.value} data-autofocus={f.name === 'name' || undefined}
                      dir={'dir' in f ? f.dir : undefined} type={'type' in f ? f.type : 'text'}
                      onChange={(e) => field.handleChange(e.target.value)} />
                    {f.name === 'guardianPhone' && <PhonePreview value={field.state.value} />}
                  </>
                )}
              </Field>
            )}
          </form.Field>
        ))}
        <form.Field name="age" validators={{ onSubmit: ({ value }) => ageError(value) }}>
          {(field) => <AgeField value={field.state.value} error={field.state.meta.errors[0]} onChange={field.handleChange} />}
        </form.Field>
        <form.Field name="gender">{(field) => <GenderField value={field.state.value} onChange={field.handleChange} />}</form.Field>
        <form.Field name="tz">
          {(field) => (
            <Field label={t.students.tz}>
              {(p) => <TimeZoneSelect {...p} value={field.state.value} onValue={field.handleChange} />}
            </Field>
          )}
        </form.Field>
        <form.Field name="program">
          {(field) => (
            <Field label={t.students.program}>
              {(p) => (
                <Select {...p} value={field.state.value} onChange={(e) => field.handleChange(e.target.value as Program)}>
                  {PROGRAMS.map((v) => (
                    <option key={v} value={v}>{t.enums.program[v]}</option>
                  ))}
                </Select>
              )}
            </Field>
          )}
        </form.Field>
        <form.Field name="source">{(field) => <SourceField value={field.state.value} onChange={field.handleChange} />}</form.Field>
        {error && <FormAlert className="sm:col-span-2">{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
