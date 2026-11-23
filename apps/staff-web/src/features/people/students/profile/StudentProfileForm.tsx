import { GENDERS, PROGRAMS, STUDENT_STATUSES } from '@ab/catalog';
import { useForm } from '@tanstack/react-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@ab/web-kit/components/ui/form/button';
import { Field } from '@ab/web-kit/components/ui/form/field';
import { Input } from '@ab/web-kit/components/ui/form/input';
import { Select } from '@ab/web-kit/components/ui/form/select';
import { TimeZoneSelect } from '@ab/web-kit/components/ui/form/time-zone-select';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { teacherLabel } from '@ab/web-kit/lib/i18n/teacher-label';
import { teacherOptionsQuery } from '@/features/people/students/api';
import { FormAlert } from '@ab/web-kit/components/ui/form/form-alert';
import { PROFILE_LABELS, toProfileValues, type ProfileValues } from './profile-form';
import { saveProfile } from './save-profile';
import { SavedNote } from './SavedNote';
import { ContactIsSelfField } from './FactFields';
import { StatusRouteDialogs, useStatusPick } from '@/features/teaching/course-actions';
import type { StudentProfile } from '@ab/shared';

type SelectName = 'gender' | 'program' | 'status' | 'teacher_id';
type FieldName = Exclude<keyof ProfileValues, 'contact_is_self'>;

/** Reading order: who (with the form's «سن الطالب» and «النوع») and with whom, what they study, then logistics. */
const FIELDS: FieldName[] = [
  'name', 'age', 'gender', 'status', 'teacher_id', 'program', 'level', 'memorized',
  'goal', 'riwaya', 'tz', 'meeting_link_override', 'notes',
];
const LTR: FieldName[] = ['meeting_link_override', 'age'];
/** The link's own hint; the status's comes from useStatusPick (its note, or «جارٍ التحميل»). */
const HINTS: Partial<Record<FieldName, string>> = {
  meeting_link_override: t.students.meetingLinkHint,
};
const SELECTS: readonly FieldName[] = ['gender', 'program', 'status', 'teacher_id'];
const isSelect = (name: FieldName): name is SelectName => SELECTS.includes(name);

/** The status picked, or undefined for every other select. */
const statusOf = (name: SelectName, value: string) =>
  name === 'status' ? STUDENT_STATUSES.find((s) => s === value) : undefined;

interface StudentProfileFormProps {
  student: StudentProfile;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

/** Editable student profile (R-STU-05), saved with PATCH /students/:id. */
export function StudentProfileForm({ student, chatPhone }: StudentProfileFormProps) {
  const queryClient = useQueryClient();
  const { data: teachers = [] } = useQuery(teacherOptionsQuery);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // «موقوف مؤقتًا» / «متوقف» lead to their dialogs (owner 2026-11-17); the rest are set at once.
  const status = useStatusPick(student.id);
  const pick = (name: SelectName, value: string, set: (v: never) => void) => {
    const picked = statusOf(name, value);
    const put = () => set(value as never);
    if (picked) status.pick(picked, put);
    else put();
  };
  const hintOf = (name: FieldName) => (name === 'status' ? status.hint : HINTS[name]);

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
            <Field id={`p-${name}`} label={PROFILE_LABELS[name]} hint={hintOf(name)}>
              {(p) =>
                name === 'tz' ? (
                  <TimeZoneSelect {...p} value={field.state.value} onValue={(tz) => field.handleChange(tz)} />
                ) : isSelect(name) ? (
                  <Select {...p} value={field.state.value}
                    onChange={(e) => pick(name, e.target.value, field.handleChange)}>
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
      <StatusRouteDialogs
        studentId={student.id}
        ask={status.ask}
        chatPhone={chatPhone}
        onClose={status.close}
        onDone={(text) => {
          status.close();
          setMessage({ ok: true, text });
        }}
      />
    </form>
  );
}
