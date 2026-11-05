import type { FamilyOption, PeopleEditView } from '@ab/shared';
import { z } from 'zod';
import { newFamilyOf, type NewFamilyForm } from './people-edit-form.js';
import type { PeopleWrite } from './people-edit-write.js';

// «ربط بولي أمر آخر» on web and mobile: the state lives in the app's hook (useState), the logic
// here.

export type MoveBody =
  { guardian_id: string } | { guardian: { name: string; phone_e164: string; tz: string } };

/** The move so far: a picked family (its id) or a parsed new one, with the name to confirm. */
export interface MoveChoice {
  body: MoveBody;
  name: string;
  id: string | null;
}

export interface AttachState {
  search: string;
  choice: MoveChoice | null;
  fresh: NewFamilyForm;
  invalid: string[];
}

type Set<T> = (value: T) => void;

interface AttachInput {
  view: PeopleEditView;
  state: AttachState;
  set: {
    search: Set<string>;
    choice: Set<MoveChoice | null>;
    fresh: Set<NewFamilyForm>;
    invalid: Set<string[]>;
  };
  families: readonly FamilyOption[] | undefined;
  /** The picker's answers for a «new» guardian's number (freshPhoneOf); undefined = loading. */
  matches: readonly FamilyOption[] | undefined;
  move: PeopleWrite<{ studentId: string; body: MoveBody }>;
  /** t.peopleEdit: moveConfirm («{student}», «{family}») and invalid. */
  text: { moveConfirm: string; invalid: string };
}

/** «ولي أمر جديد» starts empty, in the student's family zone. */
export const emptyFamily = (tz: string): NewFamilyForm => ({ name: '', phone_e164: '', tz });

export interface AttachModel extends AttachState {
  setSearch: (search: string) => void;
  /** The picker's answers once two characters are typed, else null. */
  results: readonly FamilyOption[] | null;
  empty: boolean;
  pick: (family: FamilyOption) => void;
  editFresh: (patch: Partial<NewFamilyForm>) => void;
  error: (key: string) => string | null;
  takeFresh: () => void;
  submit: () => void;
  confirmText: string | null;
  /** A family is chosen and no move is in flight. */
  ready: boolean;
  move: AttachInput['move'];
}

/** A new guardian as a move choice, or null with the fields that failed. */
function freshChoice(fresh: NewFamilyForm): { choice: MoveChoice | null; invalid: string[] } {
  const parsed = newFamilyOf(fresh);
  const choice = parsed.patch && {
    body: { guardian: parsed.patch },
    name: parsed.patch.name,
    id: null,
  };
  return { choice, invalid: parsed.invalid };
}

/** A move body naming a «new» guardian (a picked family's body has no phone). */
const freshBody = z.object({ guardian: z.object({ phone_e164: z.string() }) });
const phoneOf = (body: MoveBody | undefined): string =>
  freshBody.safeParse(body).data?.guardian.phone_e164 ?? '';

/** A «new» guardian's number ('' for a picked family): the hooks look it up (familySearchKey). */
export const freshPhoneOf = (choice: MoveChoice | null): string => phoneOf(choice?.body);

/**
 * A «new» number that is already a family's main number moves the student to THAT family (the API
 * finds it by phone): the confirm names it, never the typed name.
 */
const resolvedOf = (choice: MoveChoice | null, matches: AttachInput['matches']) =>
  choice && {
    ...choice,
    name: matches?.find((f) => f.phone_e164 === phoneOf(choice.body))?.name ?? choice.name,
  };

/** A «new» number is confirmed only once its lookup answered. */
const looked = (choice: MoveChoice | null, matches: AttachInput['matches']): boolean =>
  freshPhoneOf(choice) === '' || matches !== undefined;

/** «نقل {student} إلى عائلة {family}؟» once a family is chosen. */
const confirmOf = (view: PeopleEditView, choice: MoveChoice | null, template: string) =>
  choice && template.replace('{student}', view.student.name).replace('{family}', choice.name);

/** What both apps' attach screens read: results, pick / new guardian, confirm text and submit. */
export function attachModel(input: AttachInput): AttachModel {
  const { view, state, set, families, move, text } = input;
  const searching = state.search.trim().length >= 2;
  const takeFresh = () => {
    const { choice, invalid } = freshChoice(state.fresh);
    set.invalid(invalid);
    set.choice(choice);
  };
  const shown = searching ? (families ?? null) : null;
  return {
    ...state,
    setSearch: set.search,
    results: shown,
    empty: shown?.length === 0,
    pick: (f: FamilyOption) => set.choice({ body: { guardian_id: f.id }, name: f.name, id: f.id }),
    editFresh: (patch: Partial<NewFamilyForm>) => set.fresh({ ...state.fresh, ...patch }),
    error: (key: string): string | null => (state.invalid.includes(key) ? text.invalid : null),
    takeFresh,
    submit: () => {
      if (state.choice) move.mutate({ studentId: view.student.id, body: state.choice.body });
    },
    confirmText: confirmOf(view, resolvedOf(state.choice, input.matches), text.moveConfirm),
    ready: state.choice !== null && !move.isPending && looked(state.choice, input.matches),
    move,
  };
}
