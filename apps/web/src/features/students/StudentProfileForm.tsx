import { PROGRAMS, STUDENT_STATUSES } from '@ab/shared';
import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import { STUDENTS_KEY, teacherOptionsQuery, updateStudent } from './api';
import { Field, selectClass } from './Field';
import { PROFILE_LABELS, toProfileValues, toStudentPatch, type ProfileValues } from './profile-form';
import { TimeZoneOptions } from './TimeZoneOptions';
import type { StudentProfile } from './types';

type SelectName = 'program' | 'status' | 'teacher_id';
type TextName = Exclude<keyof ProfileValues, SelectName>;

const TEXT_FIELDS: TextName[] = ['name', 'level', 'memorized', 'goal', 'riwaya', 'tz', 'meeting_link_override', 'notes'];
const LTR: TextName[] = ['tz', 'meeting_link_override'];

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
      className="grid gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <TimeZoneOptions />
      {(Object.keys(selects) as SelectName[]).map((name) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <Field id={`p-${name}`} label={PROFILE_LABELS[name]}>
              <select id={`p-${name}`} className={selectClass} value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value as never)}>
                {selects[name].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </Field>
          )}
        </form.Field>
      ))}
      {TEXT_FIELDS.map((name) => (
        <form.Field key={name} name={name}>
          {(field) => (
            <Field id={`p-${name}`} label={PROFILE_LABELS[name]}
              hint={name === 'meeting_link_override' ? t.students.meetingLinkHint : undefined}>
              <Input id={`p-${name}`} value={field.state.value} dir={LTR.includes(name) ? 'ltr' : undefined}
                list={name === 'tz' ? 'tz-options' : undefined}
                onChange={(e) => field.handleChange(e.target.value)} />
            </Field>
          )}
        </form.Field>
      ))}
      <div className="flex items-center gap-3 md:col-span-2">
        <form.Subscribe selector={(s) => s.isSubmitting}>
          {(submitting) => (
            <Button type="submit" disabled={submitting}>{submitting ? t.common.saving : t.common.save}</Button>
          )}
        </form.Subscribe>
        {message && (
          <p role={message.ok ? 'status' : 'alert'} className={message.ok ? 'text-sm' : 'text-sm text-destructive'}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
