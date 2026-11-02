import { newFamilyOf, type NewFamilyForm } from '@ab/client-core';
import type { FamilyOption, PeopleEditView } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { t } from '@/lib/i18n/i18n';
import {
  familySearchQuery,
  moveFamily,
  type MoveBody,
} from '@/features/people/students/people-edit/api';
import { usePeopleWrite } from '@/features/people/students/people-edit/use-people-write';

const E = t.peopleEdit;

/** The move so far: a picked family (its id) or a parsed new one, with the name to confirm. */
interface Choice {
  body: MoveBody;
  name: string;
  id: string | null;
}

/** «ربط بولي أمر آخر»: the search, the pick or the new guardian, and the move. */
export function useAttach(view: PeopleEditView, onDone: (notice: string) => void) {
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [fresh, setFresh] = useState<NewFamilyForm>({
    name: '',
    phone_e164: '',
    tz: view.guardian.tz,
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const families = useQuery(familySearchQuery(search.trim()));
  const move = usePeopleWrite(moveFamily, () => onDone(E.moved));
  const pick = (f: FamilyOption) =>
    setChoice({ body: { guardian_id: f.id }, name: f.name, id: f.id });
  const takeFresh = () => {
    const parsed = newFamilyOf(fresh);
    setInvalid(parsed.invalid);
    setChoice(
      parsed.patch && { body: { guardian: parsed.patch }, name: parsed.patch.name, id: null },
    );
  };
  const submit = () => {
    if (choice) move.mutate({ studentId: view.student.id, body: choice.body });
  };
  const editFresh = (patch: Partial<NewFamilyForm>) => setFresh((v) => ({ ...v, ...patch }));
  const confirmText =
    choice &&
    E.moveConfirm.replace('{student}', view.student.name).replace('{family}', choice.name);
  const results = search.trim().length >= 2 ? (families.data ?? null) : null;
  return {
    search,
    setSearch,
    results,
    choice,
    pick,
    fresh,
    editFresh,
    invalid,
    takeFresh,
    submit,
    move,
    confirmText,
  };
}
