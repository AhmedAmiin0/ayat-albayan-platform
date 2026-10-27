import { GENDERS, PROGRAMS, STUDENT_STATUSES } from '@ab/shared';
import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/form/button';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { TimeZoneSelect } from '@/components/ui/form/time-zone-select';
import { t } from '@/lib/i18n/i18n';
import { teacherLabel } from '@/lib/i18n/teacher-label';
import { teacherOptionsQuery } from '../api';
import { FormAlert } from '@/components/ui/form/form-alert';
import { PROFILE_LABELS, toProfileValues, type ProfileValues } from './profile-form';
import { saveProfile } from './save-profile';
import { SavedNote } from './SavedNote';
import { ContactIsSelfField } from './FactFields';
import type { StudentProfile } from '../types';

type SelectName = 'gender' | 'program' | 'status' | 'teacher_id';
type FieldName = Exclude<keyof ProfileValues, 'contact_is_self'>;

/** Reading order: who (with the form's «سن الطالب» and «النوع») and with whom, what they study, then logistics. */
const FIELDS: FieldName[] = [
  'name', 'age', 'gender', 'status', 'teacher_id', 'program', 'level', 'memorized',
  'goal', 'riwaya', 'tz', 'meeting_link_override', 'notes',
];
const LTR: FieldName[] = ['meeting_link_override', 'age'];
const SELECTS: readonly FieldName[] = ['gender', 'program', 'status', 'teacher_id'];
const isSelect = (name: FieldName): name is SelectName => SELECTS.includes(name);

/** Editable student profile (R-STU-05), saved with PATCH /students/:id. */
export function StudentProfileForm({ student }: { student: StudentProfile }) {
  const queryClient = useQueryClient();
  const { data: teachers = [] } = useQuery(teacherOptionsQuery);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selects: Record<SelectName, { value: string; label: string }[]> = {
    gender: [{ value: '', label: '—' }, ...GENDERS.map((g) => ({ value: g, label: t.enums.gender[g] }))],
    program: PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] })),
    status: STUDENT_STATUSES.map((s) => ({ value: s, label: t.enums.studentStatus[s] })),
    teacher_id: [
      { value: '', label: t.students.noTeacher },
      ...teachers.map((tc) => ({ value: tc.id, label: teacherLabel(tc) })),
    ],
  };

  // The status the form shows as loaded (not picked by the admin): sent as expected_status (R-STU-05).
  const loaded = useRef(student.status);
  const form = useForm({
    defaultValues: toProfileValues(student),
    onSubmit: async ({ value }) => {
      const r = await saveProfile({ student, values: value, loaded: loaded.current, queryClient });
      setMessage(r.message);
      if (r.saved) {
        loaded.current = r.saved.status;
        form.reset(r.saved, { keepDefaultValues: true });
      }
      if (r.current) {
        loaded.current = r.current;
        form.setFieldValue('status', r.current);
      }
    },
  });
  // An untouched form follows a refetched student (useForm resets it from the new defaults first).
  useEffect(() => {
    if (!form.state.isTouched) loaded.current = student.status;
  }, [student, form]);

  return (
    <form
      className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      {FIELDS.map((name) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <Field id={`p-${name}`} label={PROFILE_LABELS[name]}
              hint={name === 'meeting_link_override' ? t.students.meetingLinkHint : undefined}>
              {(p) =>
                name === 'tz' ? (
                  <TimeZoneSelect {...p} value={field.state.value} onValue={(tz) => field.handleChange(tz)} />
                ) : isSelect(name) ? (
                  <Select {...p} value={field.state.value} onChange={(e) => field.handleChange(e.target.value as never)}>
                    {selects[name].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : (
                  <Input {...p} value={field.state.value} dir={LTR.includes(name) ? 'ltr' : undefined}
                    type={name === 'age' ? 'number' : 'text'} inputMode={name === 'age' ? 'numeric' : undefined}
                    onChange={(e) => field.handleChange(e.target.value)} />
                )
              }
            </Field>
          )}
        </form.Field>
      ))}
      <form.Field name="contact_is_self">
        {(field) => <ContactIsSelfField name="p-contact_is_self" value={field.state.value} onChange={field.handleChange} />}
      </form.Field>
      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-4 sm:col-span-full">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={submitting}>{submitting ? t.common.saving : t.common.save}</Button>
          )}
        </form.Subscribe>
        {message && (message.ok ? <SavedNote>{message.text}</SavedNote> : <FormAlert>{message.text}</FormAlert>)}
      </div>
    </form>
  );
}
