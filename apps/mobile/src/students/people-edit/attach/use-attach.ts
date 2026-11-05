import {
  attachModel,
  emptyFamily,
  freshPhoneOf,
  type AttachModel,
  type MoveChoice,
} from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import {
  moveFamily,
  useFamilySearch,
  usePeopleWrite,
} from '@/students/people-edit/people-edit-api';

/** «ربط بولي أمر آخر» (the web's useAttach): the state here, the logic in attachModel. */
export function useAttach(view: PeopleEditView, onDone: (notice: string) => void): AttachModel {
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<MoveChoice | null>(null);
  const [fresh, setFresh] = useState(() => emptyFamily(view.guardian.tz));
  const [invalid, setInvalid] = useState<string[]>([]);
  const found = useFamilySearch(search.trim()).data;
  // A «new» number that already exists is that family: the confirm names it.
  const matches = useFamilySearch(freshPhoneOf(choice)).data;
  const move = usePeopleWrite(moveFamily, () => onDone(t.peopleEdit.moved));
  return attachModel({
    view,
    state: { search, choice, fresh, invalid },
    set: { search: setSearch, choice: setChoice, fresh: setFresh, invalid: setInvalid },
    families: found,
    matches,
    move,
    text: t.peopleEdit,
  });
}
