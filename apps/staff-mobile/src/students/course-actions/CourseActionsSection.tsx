import type { CourseMoveKind } from '@ab/client-core';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { Note } from '@/more';
import { PauseSheetFrame } from '@/students/course-pause/PauseSheetFrame';
import { ActionButtons, useActionKeys, type Open } from './ActionButtons';
import { useCurrentSubscription, useHeldPackage } from './course-actions-api';
import { CourseMoveSheet } from './CourseMoveSheet';
import { CourseStopForm } from './CourseStopForm';
import { ExtendForm } from '@/students/course-card/ExtendForm';

interface CourseActionsSectionProps {
  studentId: string;
  /** The package; absent or null = the student's current one, as the server answers it. */
  subscriptionId?: string | null | undefined;
  /** False hides teacher and time changes (the API would refuse not_your_student). */
  moves?: boolean;
  /** The package whose course the moves change (owner 2026-11-06); absent = the package. */
  movesOf?: string | null | undefined;
  /** Offered when the card counts lessons without a date. */
  extend?: boolean;
  extra?: ReactNode;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

type Keys = ReturnType<typeof useActionKeys>;
const withoutMoves = (keys: Keys): Keys => ({
  ...keys,
  teacher: false,
  times: false,
  any: keys.stop,
});
/** moves (default true) → the held keys as they are, else without the two moves. */
const KEYS_OF: Record<'true' | 'false', (keys: Keys) => Keys> = {
  true: (keys) => keys,
  false: withoutMoves,
};

/** The key filter of `moves` (absent = true). */
const keysOf = (moves: boolean | undefined) => KEYS_OF[moves === false ? 'false' : 'true'];

const isMove = (open: Open): open is CourseMoveKind => open === 'teacher' || open === 'times';

/** Any student, each action behind its own key; nothing without a package or a key. */
export function CourseActionsSection(props: CourseActionsSectionProps) {
  const { studentId, subscriptionId, movesOf } = props;
  const keys = keysOf(props.moves)(useActionKeys());
  const current = useCurrentSubscription({ studentId, given: subscriptionId, keys });
  const [open, setOpen] = useState<Open>(null);
  const sub = useHeldPackage(current, open !== null);
  const [notice, setNotice] = useState<string | null>(null);
  const c = t.courseActions;
  const said = notice ? <Note>{notice}</Note> : null;
  if (!sub || (!keys.any && notice === null)) return <>{said}{props.extra}</>;
  const close = () => setOpen(null);
  const done = (text: string) => {
    setOpen(null);
    setNotice(text);
  };
  const moveDone = open === 'teacher' ? c.teacher.done : c.times.done;
  const stopping = { studentId, subscriptionId: sub };
  const moving = { studentId, subscriptionId: movesOf ?? sub };
  return (
    <View>
      {said}
      <ActionButtons
        keys={keys}
        extend={props.extend}
        extra={props.extra}
        onOpen={(next) => {
          setNotice(null);
          setOpen(next);
        }}
      />
      <PauseSheetFrame open={open === 'stop'} title={c.stop.title} onClose={close}>
        <CourseStopForm sub={stopping} onClose={close} onDone={done} chatPhone={props.chatPhone} />
      </PauseSheetFrame>
      <PauseSheetFrame open={open === 'extend'} title={t.courseCard.extend.title} onClose={close}>
        <ExtendForm sub={moving} onClose={close} onDone={done} />
      </PauseSheetFrame>
      {isMove(open) ? (
        <CourseMoveSheet
          sub={moving}
          kind={open}
          onClose={close}
          onDone={() => done(moveDone)}
        />
      ) : null}
    </View>
  );
}
