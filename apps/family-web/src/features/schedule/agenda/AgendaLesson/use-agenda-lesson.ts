import { lessonWait } from '@ab/client-core';
import type { RoomJoinResult } from '@ab/schedule';
import { clockOf } from '@ab/time';
import { useState } from 'react';
import { useClock, useNow, useViewerTz } from '@ab/web-kit';
import type { AgendaLessonProps } from './AgendaLesson.types';

/** The join button lights up by itself when the window opens. */
const TICK_MS = 1_000;
export function useAgendaLesson({ entry }: Pick<AgendaLessonProps, 'entry'>) {
  const { lesson, student } = entry;
  const now = useNow(TICK_MS);
  const tz = useViewerTz();
  const clock = { ...useClock(), tz };
  const [room, setRoom] = useState<RoomJoinResult | null>(null);
  const open = lessonWait(lesson, now) === null;
  const [from, to] = [lesson.starts_at, lesson.ends_at].map((at) => clockOf(new Date(at), clock));
  const range = `${from ?? ''} – ${to ?? ''}`;
  return { lesson, student, now, tz, room, setRoom, open, range };
}
