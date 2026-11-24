import type { BookingMode } from '@ab/client-core';
import { useState } from 'react';
import { usePermissions } from '@/features/people/auth';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { ActionItem } from './card/ActionItem';
import { ExtendDialog } from './card/ExtendDialog';
import { ChangeTeacherDialog } from './ChangeTeacherDialog';
import { ChangeTimesDialog } from './ChangeTimesDialog';
import { StopCourseDialog } from './StopCourseDialog';
import type { StopChat } from './StopDoneDialog';

export interface CourseActionsProps {
  studentId: string;
  /** The current package (its course). */
  subscriptionId: string;
  /** admin (the student file) may save over a clash with a reason; sales never. */
  mode: BookingMode;
  /** The page's toast. */
  onDone: (message: string) => void;
  extend?: boolean;
  /** False hides teacher and time changes when no course is booked yet (no dead end). */
  moves?: boolean;
  group?: Group;
  /** The guardian's phone: the stop's done block opens the chat. */
  chatPhone?: string | undefined;
}

type Group = 'course' | 'package';
/** Which groups render: one, or both (absent). */
const shows = (group: Group | undefined, own: Group): boolean =>
  group === undefined || group === own;
/** The done block's chat in the viewer's inbox, when the phone is known. */
const chatOf = (phone: string | undefined, mode: BookingMode): StopChat | undefined =>
  phone ? { phone, mode } : undefined;

type Open = 'stop' | 'teacher' | 'times' | 'extend' | null;
type Can = (key: 'students.change_teacher' | 'courses.reschedule') => boolean;

/** The moves offered, in the board's order, each with what it does (owner 2026-11-17). */
function moveItems(can: Can, props: Pick<CourseActionsProps, 'moves' | 'extend' | 'group'>) {
  if (!shows(props.group, 'course')) return [];
  const words = t.courseActions;
  const hints = t.courseCard.hints;
  const moves = props.moves !== false;
  const times = can('courses.reschedule');
  const teacher = moves && can('students.change_teacher');
  const extend = props.extend === true && times;
  const items = [
    { open: 'teacher', label: words.teacher.action, hint: hints.teacher, on: teacher },
    { open: 'times', label: words.times.action, hint: hints.times, on: moves && times },
    { open: 'extend', label: t.courseCard.extend.action, hint: hints.extend, on: extend },
  ] as const;
  return items.filter((i) => i.on);
}

/** Each action behind its own permission key; admins and sales, any student, not teachers. */
export function CourseActions(props: CourseActionsProps) {
  const { studentId, subscriptionId, mode, onDone, chatPhone } = props;
  const { can } = usePermissions();
  const stops = shows(props.group, 'package') && can('subscriptions.stop');
  const [open, setOpen] = useState<Open>(null);
  const words = t.courseActions;
  const shared = {
    studentId,
    subscriptionId,
    onClose: () => setOpen(null),
    onDone: (message: string) => {
      setOpen(null);
      onDone(message);
    },
  };
  return (
    <>
      {moveItems(can, props).map((i) => (
        <ActionItem key={i.open} label={i.label} hint={i.hint} onClick={() => setOpen(i.open)} />
      ))}
      {stops && (
        <ActionItem
          label={words.stop.action}
          hint={t.courseCard.hints.stop}
          onClick={() => setOpen('stop')}
          danger
        />
      )}
      {open === 'teacher' && <ChangeTeacherDialog {...shared} mode={mode} />}
      {open === 'times' && <ChangeTimesDialog {...shared} mode={mode} />}
      {open === 'extend' && <ExtendDialog {...shared} />}
      {open === 'stop' && <StopCourseDialog {...shared} chat={chatOf(chatPhone, mode)} />}
    </>
  );
}
