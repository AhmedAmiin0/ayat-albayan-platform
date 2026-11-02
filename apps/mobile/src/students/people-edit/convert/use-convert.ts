import type { PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import {
  guardianToStudent,
  setContactSelf,
  studentToGuardian,
  usePeopleWrite,
} from '@/students/people-edit/people-edit-api';

const E = t.peopleEdit;
export type Conversion = 'toStudent' | 'toGuardian';

/** The writes of «تحويل» (the web's useConvert): the toggle and two confirmed conversions. */
export function useConvert(view: PeopleEditView, onDone: (notice: string) => void) {
  const [asking, setAsking] = useState<Conversion | null>(null);
  const self = usePeopleWrite(setContactSelf, () => onDone(E.saved));
  const toStudent = usePeopleWrite(guardianToStudent, (r) =>
    onDone(E.toStudentDone.replace('{code}', r.code ?? '')),
  );
  const toGuardian = usePeopleWrite(studentToGuardian, () =>
    onDone(E.toGuardianDone.replace('{name}', view.student.name)),
  );
  const RUN: Record<Conversion, { text: string; run: () => void }> = {
    toStudent: {
      text: E.toStudentConfirm.replace('{name}', view.guardian.name),
      run: () => toStudent.mutate(view.guardian.id),
    },
    toGuardian: {
      text: E.toGuardianConfirm.replace('{name}', view.student.name),
      run: () => toGuardian.mutate(view.student.id),
    },
  };
  return {
    self,
    ask: setAsking,
    confirm: asking ? RUN[asking] : null,
    busy: toStudent.isPending || toGuardian.isPending,
    error: self.errorText ?? toStudent.errorText ?? toGuardian.errorText,
  };
}
