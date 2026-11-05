import type { FamilyOption, PeopleEditView } from '@ab/shared';
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
function freshChoice(fresh: NewFamilyForm): {
  choice: MoveChoice | null;
  invalid: string[];
  phone: string | null;
} {
  const parsed = newFamilyOf(fresh);
  const choice = parsed.patch && {
    body: { guardian: parsed.patch },
    name: parsed.patch.name,
    id: null,
  };
  return { choice, invalid: parsed.invalid, phone: parsed.patch?.phone_e164 ?? null };
}

/**
 * A «new» family whose main number already exists IS that family (the API finds it by its phone
 * first, #621 review): the choice becomes it, so the confirm names the real family and the move
 * goes by its id (and the ownership check).
 */
function resolved(choice: MoveChoice | null, families: readonly FamilyOption[] | undefined) {
  const phone = choice && 'guardian' in choice.body ? choice.body.guardian.phone_e164 : null;
  const found = families?.find((f) => f.phone_e164 === phone);
  return found ? { body: { guardian_id: found.id }, name: found.name, id: found.id } : choice;
}

/** «نقل {student} إلى عائلة {family}؟» once a family is chosen. */
const confirmOf = (view: PeopleEditView, choice: MoveChoice | null, template: string) =>
  choice && template.replace('{student}', view.student.name).replace('{family}', choice.name);

/** What both apps' attach screens read: results, pick / new guardian, confirm text and submit. */
export function attachModel({ view, state, set, families, move, text }: AttachInput): AttachModel {
  const searching = state.search.trim().length >= 2;
  const takeFresh = () => {
    const { choice, invalid, phone } = freshChoice(state.fresh);
    set.invalid(invalid);
    set.choice(choice);
    // The picker then looks the number up: an existing family with it replaces the typed name.
    if (phone) set.search(phone);
  };
  const shown = searching ? (families ?? null) : null;
  const choice = resolved(state.choice, shown ?? undefined);
  /** A typed family waits for the number's lookup before it can be confirmed. */
  const looked = choice?.id !== null || shown !== null;
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
      if (choice) move.mutate({ studentId: view.student.id, body: choice.body });
    },
    confirmText: confirmOf(view, choice, text.moveConfirm),
    ready: choice !== null && looked && !move.isPending,
    move,
  };
}
