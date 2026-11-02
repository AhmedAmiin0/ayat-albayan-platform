import { familyFormOf, familyPatchOf, studentFormOf, studentPatchOf, type FamilyForm, type StudentForm } from '@ab/client-core';
import { formatPhone, type PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { InlineConfirm } from '@/core/ui/feedback/InlineConfirm';
import { Button } from '@/core/ui/primitives/Button';
import { ltr } from '@/core/ui/primitives/Ltr';
import { Note } from '@/more';
import { SheetActions } from '@/students/course-pause/SheetActions';
import { FamilyEditFields } from './FamilyEditFields';
import { removeSecondPhone, saveFamily, saveStudent, usePeopleWrite } from './people-edit-api';
import type { PeopleSheetProps } from './PeopleEditSection';
import { StudentEditFields } from './StudentEditFields';

const E = t.peopleEdit;

interface Forms {
  student: StudentForm;
  family: FamilyForm;
}

const hasChange = <P extends object>(patch: P | null): patch is P => patch !== null && Object.keys(patch).length > 0;

/** Both PATCHes, the student first; only a part with a change is sent (the web's saveBoth). */
async function saveBoth(input: { view: PeopleEditView; initial: Forms; current: Forms }) {
  const student = studentPatchOf(input.initial.student, input.current.student).patch;
  const family = familyPatchOf(input.initial.family, input.current.family).patch;
  if (hasChange(student)) await saveStudent({ id: input.view.student.id, patch: student });
  if (hasChange(family)) await saveFamily({ id: input.view.guardian.id, patch: family });
}

/** «تعديل البيانات»: the student's and the family's details, and the family's second number. */
export function EditDataSheet({ view, onClose, onDone }: PeopleSheetProps) {
  const [initial] = useState<Forms>(() => ({ student: studentFormOf(view.student), family: familyFormOf(view.guardian) }));
  const [current, setCurrent] = useState<Forms>(initial);
  const [invalid, setInvalid] = useState<{ student: string[]; family: string[] }>({ student: [], family: [] });
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
      <StudentEditFields value={current.student} invalid={invalid.student} onChange={(p) => setCurrent((c) => ({ ...c, student: { ...c.student, ...p } }))} />
      <FamilyEditFields value={current.family} invalid={invalid.family} onChange={(p) => setCurrent((c) => ({ ...c, family: { ...c.family, ...p } }))} />
      <SecondPhoneRow guardian={view.guardian} onDone={onDone} />
      {save.errorText ? <Note alert>{save.errorText}</Note> : null}
      <SheetActions label={E.save} busy={save.isPending} onConfirm={submit} onCancel={onClose} />
    </View>
  );
}

/** The family's second number with «حذف الرقم الثاني» behind an inline confirm; nothing without one. */
function SecondPhoneRow({ guardian, onDone }: { guardian: PeopleEditView['guardian']; onDone: (notice: string) => void }) {
  const [asking, setAsking] = useState(false);
  const remove = usePeopleWrite(removeSecondPhone, () => onDone(E.saved));
  const second = guardian.phones.find((p) => !p.is_primary);
  if (!second) return null;
  const phone = ltr(formatPhone(second.phone_e164));
  const run = () => remove.mutate({ guardianId: guardian.id, phone: second.phone_e164 });
  return (
    <View style={{ gap: 8 }}>
      <Note>{`${E.fields.secondPhone}: ${phone}`}</Note>
      {asking ? (
        <InlineConfirm message={E.removeSecondConfirm.replace('{phone}', phone)} confirmLabel={E.removeSecond} busy={remove.isPending} tone="danger" onConfirm={run} onCancel={() => setAsking(false)} />
      ) : (
        <Button variant="secondary" label={E.removeSecond} onPress={() => setAsking(true)} />
      )}
      {remove.errorText ? <Note alert>{remove.errorText}</Note> : null}
    </View>
  );
}
