import {
  FAMILY_NOTICE,
  lessonOptions,
  type FamilyAction,
  type LessonOption,
} from '@ab/client-core';
import { useState } from 'react';
import { t } from '@ab/mobile-kit';
import { useFamilyAction } from '@/portal';
import type { LessonOptionsProps, Sheet } from './LessonOptions.types';

type Setup = Pick<LessonOptionsProps, 'lesson' | 'student' | 'now' | 'onNotice'>;

export function useLessonOptions({ lesson, student, now, onNotice }: Setup) {
  const [sheet, setSheet] = useState<Sheet>(null);
  const action = useFamilyAction();
  const ids = { studentId: student.id, lessonId: lesson.id };
  const open = (next: Sheet) => {
    action.reset();
    setSheet(next);
  };
  const finish = (kind: FamilyAction['kind']) => () => {
    setSheet(null);
    onNotice(t.portal.actions[FAMILY_NOTICE[kind]]);
  };
  const hasOptions = lessonOptions(lesson, now).length > 0;
  return {
    sheet,
    busy: action.busy,
    error: action.error,
    openMenu: hasOptions ? () => open('menu') : null,
    close: () => setSheet(null),
    pick: (o: Exclude<LessonOption, 'decline'>) =>
      o === 'request' ? open('ask') : action.send({ kind: o, ...ids }, finish(o)),
    decline: (reason: string) => action.send({ kind: 'cancel', ...ids, reason }, finish('cancel')),
    send: (ask: { startsAt: string; note: string }) =>
      action.send({ kind: 'request', ...ids, ...ask }, finish('request')),
  };
}
