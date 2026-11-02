import { newFamilyOf, type NewFamilyForm } from '@ab/client-core';
import type { FamilyOption, PeopleEditView } from '@ab/shared';
import { useState } from 'react';
import { t } from '@/core/lib/i18n/i18n';
import {
  moveFamily,
  useFamilySearch,
  usePeopleWrite,
  type MoveBody,
} from '@/students/people-edit/people-edit-api';

const E = t.peopleEdit;

interface Choice {
  body: MoveBody;
  name: string;
  id: string | null;
}

/** «ربط بولي أمر آخر» (the web's useAttach): search, pick or a new guardian, and the move. */
export function useAttach(view: PeopleEditView, onDone: (notice: string) => void) {
  const [search, setSearch] = useState('');
  const [choice, setChoice] = useState<Choice | null>(null);
  const [fresh, setFresh] = useState<NewFamilyForm>({
    name: '',
    phone_e164: '',
    tz: view.guardian.tz,
  });
  const [invalid, setInvalid] = useState<string[]>([]);
  const families = useFamilySearch(search.trim());
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
  const error = (key: string) => (invalid.includes(key) ? E.invalid : null);
  const confirmText =
    choice &&
    E.moveConfirm.replace('{student}', view.student.name).replace('{family}', choice.name);
  const empty = search.trim().length >= 2 && families.data?.length === 0;
  return {
    setSearch,
    families: families.data ?? [],
    empty,
    choice,
    pick,
    fresh,
    editFresh,
    error,
    takeFresh,
    submit,
    move,
    confirmText,
  };
}
