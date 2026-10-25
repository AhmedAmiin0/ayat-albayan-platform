import { useForm } from '@tanstack/react-form';
import { useId } from 'react';
import { Button } from '@/components/ui/form/button';
import { Dialog } from '@/components/ui/overlay/dialog';
import { Field } from '@/components/ui/form/field';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Input } from '@/components/ui/form/input';
import { RequiredLegend } from '@/components/ui/form/label';
import { PhonePreview } from '@/components/ui/form/phone-preview';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { SourceField } from '@/features/guardians/SourceField';
import { t } from '@/lib/i18n';
import { ageError, EMPTY_STUDENT, phoneError, requiredError, type CreateStudentValues } from './create-student';
import { AgeField, GenderField } from './FactFields';
import { ProgramField } from './ProgramField';
import { TeacherField } from './TeacherField';

type CreateStudentFormProps = {
  onSubmit: (values: CreateStudentValues) => Promise<void>;
  onCancel: () => void;
  error: string | null;
  /**
   * «تسجيل الطالب» from an inbox thread: the lead's data pre-filled, the thread's phone read-only,
   * and only the essentials asked — program and source keep these values without a field.
   */
  initial?: Partial<CreateStudentValues>;
  title?: string;
};

// The registration form's wording and order: «اسم الطالب», «رقم الواتساب (مع كود الدولة)» with its
// hint, «سن الطالب», «النوع», then the guardian's name (kept on the guardian), the zone, the
// program, «المعلم/المعلمه» and «عرفت عننا منين؟» (optional).
const TEXT_FIELDS = {
  name: { label: t.leads.studentName, check: requiredError },
  guardianName: { label: t.guardians.name, check: requiredError },
  guardianPhone: { label: t.guardians.phone, check: phoneError, dir: 'ltr', type: 'tel', hint: t.guardians.phoneHint },
} as const;
type TextName = keyof typeof TEXT_FIELDS;

/**
 * «إضافة طالب» dialog: student + guardian phone in one step (R-STU-02, R-STU-04). `noValidate`:
 * errors are the Arabic field errors (docs/07 §10), never the browser's bubble.
 */
export function CreateStudentForm({ onSubmit, onCancel, error, initial, title }: CreateStudentFormProps) {
  const formId = useId();
  const defaultValues: CreateStudentValues = { ...EMPTY_STUDENT, ...initial };
  const form = useForm({ defaultValues, onSubmit: ({ value }) => onSubmit(value) });
  const compact = initial !== undefined;
  const lockedPhone = Boolean(initial?.guardianPhone);

  const textField = (name: TextName) => {
    const f: { label: string; check: (v: string) => string | undefined; dir?: string; type?: string; hint?: string } = TEXT_FIELDS[name];
    return (
      <form.Field name={name} validators={{ onSubmit: ({ value }) => f.check(value) }}>
        {(field) => (
          <Field label={f.label} hint={f.hint} error={field.state.meta.errors[0]} required>
            {(p) => (
              <>
                <Input {...p} required value={field.state.value} data-autofocus={name === 'name' || undefined}
                  readOnly={(name === 'guardianPhone' && lockedPhone) || undefined}
                  dir={f.dir} type={f.type ?? 'text'} onChange={(e) => field.handleChange(e.target.value)} />
                {name === 'guardianPhone' && <PhonePreview value={field.state.value} />}
              </>
            )}
          </Field>
        )}
      </form.Field>
    );
  };

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
    <Dialog title={title ?? t.students.add} onClose={onCancel} actions={actions} className="max-w-[640px]" wide>
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
        {textField('name')}
        {textField('guardianPhone')}
        <form.Field name="age" validators={{ onSubmit: ({ value }) => ageError(value) }}>
          {(field) => <AgeField value={field.state.value} error={field.state.meta.errors[0]} onChange={field.handleChange} />}
        </form.Field>
        <form.Field name="gender">{(field) => <GenderField value={field.state.value} onChange={field.handleChange} />}</form.Field>
        {textField('guardianName')}
        <form.Field name="tz">
          {(field) => (
            <Field label={t.students.tz}>
              {(p) => <TimeZoneSelect {...p} value={field.state.value} onValue={field.handleChange} />}
            </Field>
          )}
        </form.Field>
        {!compact && (
          <form.Field name="program">{(field) => <ProgramField value={field.state.value} onChange={field.handleChange} />}</form.Field>
        )}
        <form.Field name="teacher_id">
          {(field) => <TeacherField value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
        {!compact && (
          <form.Field name="source">{(field) => <SourceField value={field.state.value} onChange={field.handleChange} />}</form.Field>
        )}
        {error && <FormAlert className="sm:col-span-2">{error}</FormAlert>}
      </form>
    </Dialog>
  );
}
