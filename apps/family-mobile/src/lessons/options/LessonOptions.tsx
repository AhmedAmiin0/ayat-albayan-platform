import { FAMILY_NOTICE, lessonOptions, type FamilyAction, type LessonOption } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useState } from 'react';
import { Button, t } from '@ab/mobile-kit';
import { useFamilyAction } from '@/portal';
import { AskTimeSheet } from './AskTimeSheet';
import { OptionsMenu } from './OptionsMenu';

type Sheet = 'menu' | 'ask' | null;

interface LessonOptionsProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** The menu's heading («حلقة الغد · 6:30 م – 7:15 م»). */
  heading: string;
  /** What the card says once an action lands. */
  onNotice: (message: string) => void;
}

/**
 * «خيارات الحلقة» on the lesson card (owner 2026-11-17: «add button to accept or reject or
 * reschedule»): the family's own buttons, never the WhatsApp quick reply. Nothing once it started.
 */
export function LessonOptions({ lesson, student, now, heading, onNotice }: LessonOptionsProps) {
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
  const pick = (o: Exclude<LessonOption, 'decline'>) =>
    o === 'request' ? open('ask') : action.send({ kind: o, ...ids }, finish(o));
  if (lessonOptions(lesson, now).length === 0) return null;
  return (
    <>
      <Button variant="secondary" label={t.portal.actions.menuTitle} onPress={() => open('menu')} />
      <OptionsMenu
        lesson={lesson}
        heading={heading}
        now={now}
        open={sheet === 'menu'}
        busy={action.busy}
        error={action.error}
        onClose={() => setSheet(null)}
        onPick={pick}
        onDecline={(reason) => action.send({ kind: 'cancel', ...ids, reason }, finish('cancel'))}
      />
      <AskTimeSheet
        lesson={lesson}
        student={student}
        open={sheet === 'ask'}
        busy={action.busy}
        error={action.error}
        onClose={() => setSheet(null)}
        onSend={(ask) => action.send({ kind: 'request', ...ids, ...ask }, finish('request'))}
      />
    </>
  );
}
