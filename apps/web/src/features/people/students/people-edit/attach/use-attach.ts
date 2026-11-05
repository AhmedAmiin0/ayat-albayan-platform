import {
  attachModel,
  emptyFamily,
  freshPhoneOf,
  type AttachModel,
  type MoveChoice,
} from '@ab/client-core';
import type { PeopleEditView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import { familySearchQuery, moveFamily } from '@/features/people/students/people-edit/api';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

/** «ربط بولي أمر آخر»: the state here, the logic in @ab/client-core (attachModel). */
export function useAttach(view: PeopleEditView, onDone: (notice: string) => void): AttachModel {
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<MoveChoice | null>(null);
  const [fresh, setFresh] = useState(() => emptyFamily(view.guardian.tz));
  const [invalid, setInvalid] = useState<string[]>([]);
  const families = useQuery(familySearchQuery(search.trim()));
  // A «new» number that already exists is that family: the confirm names it.
  const matches = useQuery(familySearchQuery(freshPhoneOf(choice)));
  const move = usePeopleWrite(moveFamily, () => onDone(t.peopleEdit.moved));
  const set = { search: setSearch, choice: setChoice, fresh: setFresh, invalid: setInvalid };
  const state = { search, choice, fresh, invalid };
  return attachModel({
    view,
    state,
    set,
    families: families.data,
    matches: matches.data,
    move,
    text: t.peopleEdit,
  });
}
