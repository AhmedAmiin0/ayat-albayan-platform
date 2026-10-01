import { PROGRAMS, type Program } from '@ab/shared';
import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { EMPTY_STUDENT, phoneError, type CreateStudentValues } from './create-student';
import { Field, selectClass } from './Field';
import { TimeZoneOptions } from './TimeZoneOptions';

type CreateStudentFormProps = {
  onSubmit: (values: CreateStudentValues) => Promise<void>;
  onCancel: () => void;
  error: string | null;
};

const TEXT_FIELDS = [
  { name: 'guardianPhone', label: t.guardians.phone, dir: 'ltr', type: 'tel' },
  { name: 'guardianName', label: t.guardians.name },
  { name: 'name', label: t.students.name },
  { name: 'tz', label: t.students.tz, dir: 'ltr', list: 'tz-options' },
] as const;

/** Student + guardian phone in one step (R-STU-02, R-STU-04). */
export function CreateStudentForm({ onSubmit, onCancel, error }: CreateStudentFormProps) {
  const form = useForm({
    defaultValues: EMPTY_STUDENT,
    onSubmit: ({ value }) => onSubmit(value),
  });

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <TimeZoneOptions />
      {TEXT_FIELDS.map((f) => (
        <form.Field
          key={f.name}
          name={f.name}
          validators={f.name === 'guardianPhone' ? { onSubmit: ({ value }) => phoneError(value) } : {}}
        >
          {(field) => (
            <Field id={`new-${f.name}`} label={f.label} error={field.state.meta.errors[0]}>
              <Input id={`new-${f.name}`} required value={field.state.value}
                dir={'dir' in f ? f.dir : undefined} type={'type' in f ? f.type : 'text'}
                list={'list' in f ? f.list : undefined}
                onChange={(e) => field.handleChange(e.target.value)} />
            </Field>
          )}
        </form.Field>
      ))}
      <form.Field name="program">
        {(field) => (
          <Field id="new-program" label={t.students.program}>
            <select id="new-program" className={selectClass} value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value as Program)}>
              {PROGRAMS.map((p) => (
                <option key={p} value={p}>{t.enums.program[p]}</option>
              ))}
            </select>
          </Field>
        )}
      </form.Field>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <form.Subscribe selector={(s) => s.isSubmitting}>
        {(submitting) => (
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>{t.common.cancel}</Button>
            <Button type="submit" disabled={submitting}>{submitting ? t.common.saving : t.common.save}</Button>
          </div>
        )}
      </form.Subscribe>
    </form>
  );
}
