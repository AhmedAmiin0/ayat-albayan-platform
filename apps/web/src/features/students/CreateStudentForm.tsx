import { PROGRAMS, type Program } from '@ab/shared';
import { useForm } from '@tanstack/react-form';
import { useId } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FormAlert } from '@/components/ui/form-alert';
import { Input } from '@/components/ui/input';
import { PhonePreview } from '@/components/ui/phone-preview';
import { Select } from '@/components/ui/select';
import { TimeZoneSelect } from '@/components/ui/time-zone-select';
import { t } from '@/lib/i18n';
import { EMPTY_STUDENT, phoneError, requiredError, type CreateStudentValues } from './create-student';

type CreateStudentFormProps = {
  onSubmit: (values: CreateStudentValues) => Promise<void>;
  onCancel: () => void;
  error: string | null;
};

const TEXT_FIELDS = [
  { name: 'name', label: t.students.name, check: requiredError },
  { name: 'guardianName', label: t.guardians.name, check: requiredError },
  { name: 'guardianPhone', label: t.guardians.phone, check: phoneError, dir: 'ltr', type: 'tel' },
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
        {TEXT_FIELDS.map((f) => (
          <form.Field key={f.name} name={f.name} validators={{ onSubmit: ({ value }) => f.check(value) }}>
            {(field) => (
              <Field label={f.label} error={field.state.meta.errors[0]}>
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
        {error && <FormAlert className="sm:col-span-2">{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
