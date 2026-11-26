import { FAMILY_NOTICE, lessonOptions, type FamilyAction, type LessonOption } from '@ab/client-core';
import type { PortalLesson, PortalStudent } from '@ab/shared';
import { useState, type ReactNode } from 'react';
import { Button, t } from '@ab/mobile-kit';
import { useFamilyAction } from '@/portal';
import { AskTimeSheet } from '@/lessons/options/AskTimeSheet';
import { OptionsMenu, type OptionsTitle } from '@/lessons/options/OptionsMenu';

type Sheet = 'menu' | 'ask' | null;

interface LessonOptionsProps {
  lesson: PortalLesson;
  student: PortalStudent;
  now: Date;
  /** The menu's heading, date line and excuse title. */
  title: OptionsTitle;
  /** What the card says once an action lands. */
  onNotice: (message: string) => void;
  /** Receives open, or null when the lesson offers nothing. */
  children?: (open: (() => void) | null) => ReactNode;
}

const menuButton = (open: (() => void) | null) =>
  open ? <Button variant="secondary" label={t.portal.actions.menuTitle} onPress={open} /> : null;

/** The family's own buttons, never the WhatsApp quick reply; none once started or in a group. */
export function LessonOptions(props: LessonOptionsProps) {
  const { lesson, student, now, title, onNotice, children = menuButton } = props;
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
  if (lessonOptions(lesson, now).length === 0) return children(null);
  return (
    <>
      {children(() => open('menu'))}
      <OptionsMenu
        lesson={lesson}
        title={title}
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
