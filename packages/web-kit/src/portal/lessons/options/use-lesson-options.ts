import { FAMILY_NOTICE, type FamilyAction, type LessonOption } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useFamilyAction } from './use-family-action';

export type OptionsOpen = 'decline' | 'ask' | null;

const A = t.portal.actions;
/** One tap and done: said at once (optimistic), taken back if the academy refuses it. */
const AT_ONCE: ReadonlySet<FamilyAction['kind']> = new Set(['confirm', 'withdraw', 'cancel']);

interface Of {
  lesson: PortalLesson;
  student: PortalStudent;
}

/** The line is null again once a refusal shows. */
export function useLessonOptions({ lesson, student }: Of) {
  const [open, setOpen] = useState<OptionsOpen>(null);
  const [said, setSaid] = useState<string | null>(null);
  const action = useFamilyAction();
  const ids = { studentId: student.id, lessonId: lesson.id };
  const notice = (a: FamilyAction) => setSaid(A[FAMILY_NOTICE[a.kind]]);
  const send = (a: FamilyAction) => {
    // A one-tap answer is said at once; anything else clears an earlier (maybe refused) line.
    setSaid(AT_ONCE.has(a.kind) ? A[FAMILY_NOTICE[a.kind]] : null);
    action.send(a, () => {
      setOpen(null);
      notice(a);
    });
  };
  const pick: Record<LessonOption, () => void> = {
    confirm: () => send({ kind: 'confirm', ...ids }),
    withdraw: () => send({ kind: 'withdraw', ...ids }),
    request: () => setOpen('ask'),
    decline: () => setOpen('decline'),
  };
  return { open, setOpen, said: action.error ? null : said, action, ids, send, pick };
}
