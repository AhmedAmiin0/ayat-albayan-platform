import { useForm } from '@tanstack/react-form';
import { useId } from 'react';
import {
  Button,
  Dialog,
  Field,
  FormAlert,
  Input,
  RequiredLegend,
  PhonePreview,
  TimeZoneSelect,
  t,
} from '@ab/web-kit';
import { SourceField } from '@/features/people/guardians/SourceField';
import { ageError, EMPTY_STUDENT, phoneError, requiredError, type CreateStudentValues } from './create-student';
import { AgeField, ContactIsSelfField, GenderField } from '@/features/people/students/profile/FactFields';
import { ProgramField } from '@/features/people/students/profile/ProgramField';
import { TeacherField } from '@/features/people/students/profile/TeacherField';

type CreateStudentFormProps = {
  onSubmit: (values: CreateStudentValues) => Promise<void>;
  onCancel: () => void;
  error: string | null;
  /** The thread's phone is read-only; program and source keep their values without a field. */
  initial?: Partial<CreateStudentValues>;
  title?: string;
};

const TEXT_FIELDS = {
  name: { label: t.leads.studentName, check: requiredError },
  guardianName: { label: t.guardians.name, check: requiredError },
  guardianPhone: { label: t.guardians.phone, check: phoneError, dir: 'ltr', type: 'tel', hint: t.guardians.phoneHint },
} as const;
type TextName = keyof typeof TEXT_FIELDS;

/** `noValidate` so errors are the Arabic field errors, never the browser's bubble (docs/07 §10). */
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
        <form.Field name="contactIsSelf">
          {(field) => <ContactIsSelfField name={`${formId}-contact`} value={field.state.value} onChange={field.handleChange} />}
        </form.Field>
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
