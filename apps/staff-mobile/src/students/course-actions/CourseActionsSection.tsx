import type { CourseMoveKind } from '@ab/client-core';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { t } from '@ab/mobile-kit';
import { Note } from '@/more';
import { PauseSheetFrame } from '@/students/course-pause/PauseSheetFrame';
import { ActionButtons, useActionKeys, type Open } from './ActionButtons';
import { useCurrentSubscription } from './course-actions-api';
import { CourseMoveSheet } from './CourseMoveSheet';
import { CourseStopForm } from './CourseStopForm';
import { ExtendForm } from '@/students/course-card/ExtendForm';

interface CourseActionsSectionProps {
  studentId: string;
  /** The package; absent or null = the student's current one, as the server answers it. */
  subscriptionId?: string | null | undefined;
  /**
   * false: no «تغيير المعلم» / «تغيير موعد الحلقات» (sales' student who is not hers while the
   * ownership rule holds: the API would refuse not_your_student); «إلغاء الاشتراك» stays.
   */
  moves?: boolean;
  /** The package whose course the moves change (owner 2026-11-06); absent = the package. */
  movesOf?: string | null | undefined;
  /** «مدّ الجدول» is offered: the card counts lessons without a date (owner 2026-11-17). */
  extend?: boolean;
  /** The package's rows, before «إلغاء الاشتراك». */
  extra?: ReactNode;
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

/**
 * «إلغاء الاشتراك» / «تغيير المعلم» / «تغيير موعد الحلقات» / «مدّ الجدول» in the admin's student
 * file and sales' «تفاصيل الطالب» (owner 2026-10-30, 2026-11-17), ANY student, each behind its own
 * key. Nothing without a package or a key but the package's own rows.
 */
export function CourseActionsSection(props: CourseActionsSectionProps) {
  const { studentId, subscriptionId, movesOf } = props;
  const keys = keysOf(props.moves)(useActionKeys());
  const sub = useCurrentSubscription({ studentId, given: subscriptionId, keys });
  const [open, setOpen] = useState<Open>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const c = t.courseActions;
  if (!sub || (!keys.any && notice === null)) return <>{props.extra}</>;
  const close = () => setOpen(null);
  const done = (text: string) => {
    setOpen(null);
    setNotice(text);
  };
  const moveDone = open === 'teacher' ? c.teacher.done : c.times.done;
  const moving = { studentId, subscriptionId: movesOf ?? sub };
  return (
    <View>
      {notice ? <Note>{notice}</Note> : null}
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
        <CourseStopForm sub={{ studentId, subscriptionId: sub }} onClose={close} onDone={done} />
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
