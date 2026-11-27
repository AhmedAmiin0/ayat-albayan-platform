import {
  convertDone,
  convertModel,
  type Conversion,
  type ConvertModel,
  type PeopleDone,
} from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@ab/web-kit';
import { peopleWrites } from '@/features/people/students/people-edit/api';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

export function useConvert(view: PeopleEditView, onDone: PeopleDone): ConvertModel {
  const [pending, setPending] = useState<Conversion | null>(null);
  const done = convertDone(view, onDone, t.peopleEdit);
  const self = usePeopleWrite(peopleWrites.setContactSelf, done.self);
  const toStudent = usePeopleWrite(peopleWrites.guardianToStudent, done.toStudent);
  const toGuardian = usePeopleWrite(peopleWrites.studentToGuardian, done.toGuardian);
  const writes = { self, toStudent, toGuardian };
  return convertModel({ view, pending, ask: setPending, writes, text: t.peopleEdit });
}
