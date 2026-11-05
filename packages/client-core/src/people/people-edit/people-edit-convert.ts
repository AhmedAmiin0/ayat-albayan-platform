import type { ConvertedStudent, PeopleEditView } from '@ab/shared';
import { firstError, type PeopleDone, type PeopleWrite } from './people-edit-write.js';

// «تحويل إلى طالب / ولي أمر» on web and mobile: the state lives in the app's hook, the logic here.

export type Conversion = 'toStudent' | 'toGuardian';

export interface ConvertText {
  saved: string;
  toStudentConfirm: string;
  toGuardianConfirm: string;
  toStudentDone: string;
  toGuardianDone: string;
}

/** The success handlers of the three writes; «تحويل إلى ولي أمر» removes the student row. */
interface ConvertHandlers {
  self: () => void;
  toStudent: (r: ConvertedStudent) => void;
  toGuardian: () => void;
}

export function convertDone(
  view: PeopleEditView,
  onDone: PeopleDone,
  text: ConvertText,
): ConvertHandlers {
  return {
    self: () => onDone(text.saved),
    toStudent: (r: ConvertedStudent) => onDone(text.toStudentDone.replace('{code}', r.code ?? '')),
    toGuardian: () => onDone(text.toGuardianDone.replace('{name}', view.student.name), true),
  };
}

interface ConvertInput {
  view: PeopleEditView;
  pending: Conversion | null;
  ask: (kind: Conversion | null) => void;
  writes: {
    self: PeopleWrite<{ studentId: string; value: boolean }>;
    toStudent: PeopleWrite<string>;
    toGuardian: PeopleWrite<string>;
  };
  text: ConvertText;
}

export interface ConvertModel {
  self: ConvertInput['writes']['self'];
  ask: (kind: Conversion | null) => void;
  confirm: { text: string; run: () => void } | null;
  busy: boolean;
  error: string | null;
}

/** The confirm (its sentence and its run), the busy flag and the last refusal. */
export function convertModel({ view, pending, ask, writes, text }: ConvertInput): ConvertModel {
  const PLAN: Record<Conversion, { text: string; run: () => void }> = {
    toStudent: {
      text: text.toStudentConfirm.replace('{name}', view.guardian.name),
      run: () => writes.toStudent.mutate(view.guardian.id),
    },
    toGuardian: {
      text: text.toGuardianConfirm.replace('{name}', view.student.name),
      run: () => writes.toGuardian.mutate(view.student.id),
    },
  };
  return {
    self: writes.self,
    ask,
    confirm: pending ? PLAN[pending] : null,
    busy: writes.toStudent.isPending || writes.toGuardian.isPending,
    error: firstError([writes.self, writes.toStudent, writes.toGuardian]),
  };
}
