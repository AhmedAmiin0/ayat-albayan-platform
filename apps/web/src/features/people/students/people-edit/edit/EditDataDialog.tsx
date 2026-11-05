import {
  familyFormOf,
  familyPatchOf,
  hasNotes,
  studentFormOf,
  studentPatchOf,
  studentTextKeys,
  type FamilyForm,
  type StudentForm,
} from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import type { PeopleDialogProps } from '@/features/people/students/people-edit/dialog-props';
import { useId, useState, type SubmitEvent } from 'react';
import { FormAlert } from '@/components/ui/form/form-alert';
import { Dialog } from '@/components/ui/overlay/dialog';
import { t } from '@/lib/i18n/i18n';
import { saveFamily, saveStudent } from '@/features/people/students/people-edit/api';
import { DialogActions } from '@/features/people/students/people-edit/DialogActions';
import { FamilyFields } from './FamilyFields';
import { SecondPhone } from './SecondPhone';
import { StudentFields } from './StudentFields';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

const E = t.peopleEdit;

interface Forms {
  student: StudentForm;
  family: FamilyForm;
}

/** A parsed patch that names at least one field. */
const hasChange = <P extends object>(patch: P | null): patch is P =>
  patch !== null && Object.keys(patch).length > 0;

/** Both PATCHes, the student first; only a part with a change is sent. */
async function saveBoth(input: { view: PeopleEditView; initial: Forms; current: Forms }) {
  const student = studentPatchOf(input.initial.student, input.current.student);
  const family = familyPatchOf(input.initial.family, input.current.family);
  const { student: s, guardian: g } = input.view;
  if (hasChange(student.patch)) await saveStudent({ id: s.id, patch: student.patch });
  if (hasChange(family.patch)) await saveFamily({ id: g.id, patch: family.patch });
}

/**
 * «تعديل البيانات» (owner 2026-11-02): the student's and the family's details in one form, saved
 * with PATCH /people/students/:id and /people/guardians/:id (people.edit); the family's second
 * number can be removed. Admin-only fields (status, program, teacher, link, source) are not here.
 */
export function EditDataDialog({ view, onClose, onDone }: PeopleDialogProps) {
  const formId = useId();
  const [initial] = useState<Forms>(() => ({
    student: studentFormOf(view.student),
    family: familyFormOf(view.guardian),
  }));
  const [current, setCurrent] = useState<Forms>(initial);
  const [invalid, setInvalid] = useState<string[]>([]);
  const save = usePeopleWrite(saveBoth, () => onDone(E.saved));
  const submit = (e: SubmitEvent) => {
    e.preventDefault();
    const bad = [
      ...studentPatchOf(initial.student, current.student).invalid.map((k) => `student.${k}`),
      ...familyPatchOf(initial.family, current.family).invalid.map((k) => `family.${k}`),
    ];
    setInvalid(bad);
    if (bad.length === 0) save.mutate({ view, initial, current });
  };
  const of = (part: 'student' | 'family') =>
    invalid.filter((k) => k.startsWith(`${part}.`)).map((k) => k.slice(part.length + 1));
  const actions = (
    <DialogActions onCancel={onClose} label={E.save} disabled={save.isPending} form={formId} />
  );
  return (
    <Dialog title={E.editData} onClose={onClose} actions={actions} wide>
      <form id={formId} onSubmit={submit} className="grid gap-6 sm:grid-cols-2">
        <StudentFields
          value={current.student}
          invalid={of('student')}
          texts={studentTextKeys(view)}
          onChange={(p) => setCurrent((c) => ({ ...c, student: { ...c.student, ...p } }))}
        />
        <div className="grid content-start gap-4">
          <FamilyFields
            value={current.family}
            invalid={of('family')}
            notes={hasNotes(view)}
            onChange={(p) => setCurrent((c) => ({ ...c, family: { ...c.family, ...p } }))}
          />
          <SecondPhone guardian={view.guardian} onDone={onDone} />
        </div>
      </form>
      {invalid.length > 0 && <FormAlert>{E.invalid}</FormAlert>}
      {save.errorText && <FormAlert>{save.errorText}</FormAlert>}
    </Dialog>
  );
}
