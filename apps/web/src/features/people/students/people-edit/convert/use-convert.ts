import type { PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import {
  guardianToStudent,
  setContactSelf,
  studentToGuardian,
} from '@/features/people/students/people-edit/api';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

const E = t.peopleEdit;
export type Conversion = 'toStudent' | 'toGuardian';

/**
 * The writes of «تحويل»: the «الطالب هو ولي الأمر» toggle, and the two conversions, each confirmed
 * first (`ask`, then `confirm.run`). `error` is the last refusal in MSA.
 */
export function useConvert(view: PeopleEditView, onDone: (notice: string) => void) {
  const [pending, setPending] = useState<Conversion | null>(null);
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
    ask: setPending,
    confirm: pending ? RUN[pending] : null,
    busy: toStudent.isPending || toGuardian.isPending,
    error: self.errorText ?? toStudent.errorText ?? toGuardian.errorText,
  };
}
