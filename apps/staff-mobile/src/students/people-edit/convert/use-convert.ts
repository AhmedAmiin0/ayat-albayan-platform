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
import { peopleWrites, usePeopleWrite } from '@/students/people-edit/people-edit-api';

export function useConvert(view: PeopleEditView, onDone: PeopleDone): ConvertModel {
  const [asking, setAsking] = useState<Conversion | null>(null);
  const handlers = convertDone(view, onDone, t.peopleEdit);
  return convertModel({
    view,
    pending: asking,
    ask: setAsking,
    writes: {
      self: usePeopleWrite(peopleWrites.setContactSelf, handlers.self),
      toStudent: usePeopleWrite(peopleWrites.guardianToStudent, handlers.toStudent),
      toGuardian: usePeopleWrite(peopleWrites.studentToGuardian, handlers.toGuardian),
    },
    text: t.peopleEdit,
  });
}
