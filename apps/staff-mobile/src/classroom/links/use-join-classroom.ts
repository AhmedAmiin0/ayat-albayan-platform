import { isOpenLesson, joinWindow, type LessonView } from '@ab/schedule';
import { use, useRef, useState } from 'react';
import { openRoom, useRoomsInApp } from '@/classroom/room-staff/open-room';
import { useJoinWindow } from '@/core/lib/query/public-config';
import { joinError } from './join-text';
import { SheetLeave } from './sheet-leave';
import { useNow } from '@ab/mobile-kit';

/** What joining needs of a lesson (an assistant's session has no more than this). */
export type JoinableLesson = Pick<LessonView, 'id' | 'status' | 'starts_at' | 'ends_at' | 'room_opened_at'> & {
  /** The first student's channel is the in-room chat. */
  students?: readonly { id: string }[];
};

/** API first so a refusal shows in the app (docs/35); win is null for a lesson no longer open. */
export function useJoinClassroom(lesson: JoinableLesson) {
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const config = useJoinWindow();
  const inApp = useRoomsInApp();
  const closeSheet = use(SheetLeave) ?? undefined;
  const win = isOpenLesson(lesson.status) ? joinWindow(lesson, now, config) : null;
  const join = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError(null);
    try {
      const studentId = lesson.students?.[0]?.id;
      await openRoom({ kind: 'lesson', id: lesson.id }, inApp, { closeSheet, studentId });
    } catch (e) {
      setError(joinError(e));
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  return { win, busy, error, join };
}

/** When live it is the sheet's one filled button and confirm becomes secondary (docs/07 §6). */
export function useJoinOpen(lesson: JoinableLesson): boolean {
  const now = useNow();
  const config = useJoinWindow();
  return isOpenLesson(lesson.status) && joinWindow(lesson, now, config).state === 'open';
}
