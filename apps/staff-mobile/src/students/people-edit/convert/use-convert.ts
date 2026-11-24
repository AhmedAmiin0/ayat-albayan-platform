import {
  convertDone,
  convertModel,
  type Conversion,
  type ConvertModel,
  type PeopleDone,
} from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import {
  guardianToStudent,
  setContactSelf,
  studentToGuardian,
  usePeopleWrite,
} from '@/students/people-edit/people-edit-api';

export function useConvert(view: PeopleEditView, onDone: PeopleDone): ConvertModel {
  const [asking, setAsking] = useState<Conversion | null>(null);
  const handlers = convertDone(view, onDone, t.peopleEdit);
  return convertModel({
    view,
    pending: asking,
    ask: setAsking,
    writes: {
      self: usePeopleWrite(setContactSelf, handlers.self),
      toStudent: usePeopleWrite(guardianToStudent, handlers.toStudent),
      toGuardian: usePeopleWrite(studentToGuardian, handlers.toGuardian),
    },
    text: t.peopleEdit,
  });
}
