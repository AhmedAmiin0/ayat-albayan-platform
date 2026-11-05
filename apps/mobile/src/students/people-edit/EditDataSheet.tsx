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
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { Note } from '@/more';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { FamilyEditFields } from './FamilyEditFields';
import { saveFamily, saveStudent, usePeopleWrite } from './people-edit-api';
import type { PeopleSheetProps } from './PeopleEditSection';
import { SecondPhoneRow } from './SecondPhoneRow';
import { StudentEditFields } from './StudentEditFields';

const E = t.peopleEdit;

interface Forms {
  student: StudentForm;
  family: FamilyForm;
}

const hasChange = <P extends object>(patch: P | null): patch is P =>
  patch !== null && Object.keys(patch).length > 0;

/** Both PATCHes, the student first; only a part with a change is sent (the web's saveBoth). */
async function saveBoth(input: { view: PeopleEditView; initial: Forms; current: Forms }) {
  const student = studentPatchOf(input.initial.student, input.current.student).patch;
  const family = familyPatchOf(input.initial.family, input.current.family).patch;
  if (hasChange(student)) await saveStudent({ id: input.view.student.id, patch: student });
  if (hasChange(family)) await saveFamily({ id: input.view.guardian.id, patch: family });
}

/** «تعديل البيانات»: the student's and the family's details, and the family's second number. */
export function EditDataSheet({ view, onClose, onDone }: PeopleSheetProps) {
  const [initial] = useState<Forms>(() => ({
    student: studentFormOf(view.student),
    family: familyFormOf(view.guardian),
  }));
  const [current, setCurrent] = useState<Forms>(initial);
  const [invalid, setInvalid] = useState<{ student: string[]; family: string[] }>({
    student: [],
    family: [],
  });
  const save = usePeopleWrite(saveBoth, () => onDone(E.saved));
  const submit = () => {
    const bad = {
      student: studentPatchOf(initial.student, current.student).invalid,
      family: familyPatchOf(initial.family, current.family).invalid,
    };
    setInvalid(bad);
    if (bad.student.length + bad.family.length === 0) save.mutate({ view, initial, current });
  };
  return (
    <View style={{ gap: 20 }}>
      <StudentEditFields
        value={current.student}
        invalid={invalid.student}
        texts={studentTextKeys(view)}
        onChange={(p) => setCurrent((c) => ({ ...c, student: { ...c.student, ...p } }))}
      />
      <FamilyEditFields
        value={current.family}
        invalid={invalid.family}
        notes={hasNotes(view)}
        onChange={(p) => setCurrent((c) => ({ ...c, family: { ...c.family, ...p } }))}
      />
      <SecondPhoneRow guardian={view.guardian} onDone={onDone} />
      {save.errorText ? <Note alert>{save.errorText}</Note> : null}
      <SheetActions label={E.save} busy={save.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}
