import { PROGRAMS, STUDENT_STATUSES } from '@ab/shared';
import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { t } from '@/lib/i18n';
import { STUDENTS_KEY, teacherOptionsQuery, updateStudent } from './api';
import { FormAlert } from './FormAlert';
import { PROFILE_LABELS, toProfileValues, toStudentPatch, type ProfileValues } from './profile-form';
import { SavedNote } from './SavedNote';
import { TimeZoneOptions } from './TimeZoneOptions';
import type { StudentProfile } from './types';

type SelectName = 'program' | 'status' | 'teacher_id';
type FieldName = keyof ProfileValues;

/** Reading order: who and with whom, what they study, then logistics. */
const FIELDS: FieldName[] = [
  'name', 'status', 'teacher_id', 'program', 'level', 'memorized',
  'goal', 'riwaya', 'tz', 'meeting_link_override', 'notes',
];
const LTR: FieldName[] = ['tz', 'meeting_link_override'];
const isSelect = (name: FieldName): name is SelectName => name === 'program' || name === 'status' || name === 'teacher_id';

/** Editable student profile (R-STU-05), saved with PATCH /students/:id. */
export function StudentProfileForm({ student }: { student: StudentProfile }) {
  const queryClient = useQueryClient();
  const { data: teachers = [] } = useQuery(teacherOptionsQuery);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const selects: Record<SelectName, { value: string; label: string }[]> = {
    program: PROGRAMS.map((p) => ({ value: p, label: t.enums.program[p] })),
    status: STUDENT_STATUSES.map((s) => ({ value: s, label: t.enums.studentStatus[s] })),
    teacher_id: [
      { value: '', label: t.students.noTeacher },
      ...teachers.map((tc) => ({ value: tc.id, label: tc.display_name_ar })),
    ],
  };

  const form = useForm({
    defaultValues: toProfileValues(student),
    onSubmit: async ({ value }) => {
      const r = toStudentPatch(value);
      if (!r.ok) return setMessage({ ok: false, text: r.error });
      try {
        await updateStudent(student.id, r.patch);
        await queryClient.invalidateQueries({ queryKey: STUDENTS_KEY });
        setMessage({ ok: true, text: t.students.updated });
      } catch {
        setMessage({ ok: false, text: t.common.error });
      }
    },
  });

  return (
    <form
      className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <TimeZoneOptions />
      {FIELDS.map((name) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <Field id={`p-${name}`} label={PROFILE_LABELS[name]}
              hint={name === 'meeting_link_override' ? t.students.meetingLinkHint : undefined}>
              {(p) =>
                isSelect(name) ? (
                  <Select {...p} value={field.state.value} onChange={(e) => field.handleChange(e.target.value as never)}>
                    {selects[name].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                ) : (
                  <Input {...p} value={field.state.value} dir={LTR.includes(name) ? 'ltr' : undefined}
                    list={name === 'tz' ? 'tz-options' : undefined}
                    onChange={(e) => field.handleChange(e.target.value)} />
                )
              }
            </Field>
          )}
        </form.Field>
      ))}
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
