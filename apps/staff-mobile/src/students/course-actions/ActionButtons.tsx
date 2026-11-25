import type { CourseMoveKind } from '@ab/client-core';
import type { ReactNode } from 'react';
import { useHolds, t } from '@ab/mobile-kit';
import { ActionRow } from '@/students/course-card/ActionRow';

export type Open = 'stop' | 'extend' | CourseMoveKind | null;

interface ActionKeys {
  stop: boolean;
  teacher: boolean;
  times: boolean;
  any: boolean;
}

/** subscriptions.stop, students.change_teacher, courses.reschedule (admin and sales by default). */
export function useActionKeys(): ActionKeys {
  const stop = useHolds('subscriptions.stop');
  const teacher = useHolds('students.change_teacher');
  const times = useHolds('courses.reschedule');
  return { stop, teacher, times, any: stop || teacher || times };
}

interface ActionRowsProps {
  keys: ActionKeys;
  /** Package lessons without a date can be extended (courses.reschedule, like the times). */
  extend?: boolean | undefined;
  onOpen: (next: Open) => void;
  /** The package's rows go before the destructive one. */
  extra?: ReactNode;
}

interface Row {
  open: Exclude<Open, null>;
  title: string;
  hint: string;
  on: boolean;
}

/** The rows before the package's ones, in the board's order. */
function moveRows(keys: ActionKeys, extend: boolean): Row[] {
  const c = t.courseActions;
  const hints = t.courseCard.hints;
  return [
    { open: 'teacher', title: c.teacher.action, hint: hints.teacher, on: keys.teacher },
    { open: 'times', title: c.times.action, hint: hints.times, on: keys.times },
    { open: 'extend', title: t.courseCard.extend.action, hint: hints.extend, on: keys.times && extend },
  ];
}

/** One row per key held; cancel subscription last, as the destructive one. */
export function ActionButtons({ keys, extend = false, onOpen, extra }: ActionRowsProps) {
  const stop = t.courseActions.stop;
  return (
    <>
      {moveRows(keys, extend)
        .filter((r) => r.on)
        .map((r) => (
          <ActionRow key={r.open} title={r.title} hint={r.hint} onPress={() => onOpen(r.open)} />
        ))}
      {extra}
      {keys.stop ? (
        <ActionRow
          title={stop.action}
          hint={t.courseCard.hints.stop}
          onPress={() => onOpen('stop')}
          danger
        />
      ) : null}
    </>
  );
}
