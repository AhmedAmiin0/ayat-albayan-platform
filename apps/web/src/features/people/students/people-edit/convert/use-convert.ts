import {
  convertDone,
  convertModel,
  type Conversion,
  type ConvertModel,
  type PeopleDone,
} from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import {
  guardianToStudent,
  setContactSelf,
  studentToGuardian,
} from '@/features/people/students/people-edit/api';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

/** The writes of «تحويل»: the state here, the logic in @ab/client-core (convertModel). */
export function useConvert(view: PeopleEditView, onDone: PeopleDone): ConvertModel {
  const [pending, setPending] = useState<Conversion | null>(null);
  const done = convertDone(view, onDone, t.peopleEdit);
  const self = usePeopleWrite(setContactSelf, done.self);
  const toStudent = usePeopleWrite(guardianToStudent, done.toStudent);
  const toGuardian = usePeopleWrite(studentToGuardian, done.toGuardian);
  const writes = { self, toStudent, toGuardian };
  return convertModel({ view, pending, ask: setPending, writes, text: t.peopleEdit });
}
